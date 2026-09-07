import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, CreditCard, User, ChevronRight, Truck, Check, Copy, QrCode } from "lucide-react";
import { z } from "zod";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/shopify";
import { shipping, type ShippingQuote } from "@/lib/integrations/shipping";
import { payment, type PaymentMethod } from "@/lib/integrations/payment";
import { lookupCep, formatCep } from "@/lib/integrations/viacep";
import { createOrder } from "@/lib/api/supaOrders";
import { supabase } from "@/integrations/supabase/client";
import { createMpPixPayment, getMpPaymentStatus } from "@/lib/integrations/mercadopago-pix.functions";
import { createMpCardPayment } from "@/lib/integrations/mercadopago-card.functions";
import { CardBrickPayment, type CardBrickFormData } from "@/components/CardBrickPayment";
import { validateCoupon, calculateDiscount, type Coupon } from "@/lib/coupons";
import { Ticket, X as CloseIcon } from "lucide-react";
import { upsertAbandonedCart } from "@/lib/api/abandoned";

const DRAFT_KEY = "md_checkout_draft_v1";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
  phone: z.string().max(20).optional(),
  cpf: z.string().max(14).optional(),
  cep: z.string().regex(/^\d{8}$/, "CEP inválido"),
  street: z.string().trim().min(2, "Informe a rua").max(120),
  number: z.string().trim().min(1, "Informe o número").max(15),
  complement: z.string().max(60).optional(),
  district: z.string().trim().min(2, "Informe o bairro").max(80),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  stateUf: z.string().trim().length(2, "UF deve ter 2 letras").toUpperCase(),
  shippingCode: z.string().min(1, "Selecione uma opção de frete"),
});

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar Compra — Soraia Fernandes" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

const onlyDigits = (s: string) => s.replace(/\D/g, "");

// Soma "days" dias úteis a partir de hoje, pulando sábado/domingo.
function addBusinessDays(days: number): Date {
  const d = new Date();
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

function estimatedDeliveryLabel(days: number): string {
  if (!days || days <= 0) return "Hoje";
  const date = addBusinessDays(days);
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  // identificação
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  // endereço
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  // frete e pagamento
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [shippingCode, setShippingCode] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<"idle" | "creating" | "processing" | "redirecting">("idle");
  const [pix, setPix] = useState<{
    orderNumber: string;
    paymentId: string;
    qrCode: string | null;
    qrCodeBase64: string | null;
    status: "aguardando" | "pago" | "expirado" | "erro";
  } | null>(null);
  const [card, setCard] = useState<{
    orderId: string;
    orderNumber: string;
    amount: number;
    email: string;
  } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const pollRef = useRef<number | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const c = await validateCoupon(couponCode);
      if (c) {
        setAppliedCoupon(c);
        toast.success("Cupom aplicado!");
      } else {
        toast.error("Cupom inválido ou expirado.");
      }
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0),
    [items],
  );
  const itemsCount = items.reduce((s, i) => s + i.quantity, 0);
  const selectedQuote = quotes.find((q) => q.code === shippingCode);
  const shippingCost = selectedQuote?.price ?? 0;
  const discount = appliedCoupon ? calculateDiscount(subtotal, appliedCoupon) : 0;
  const total = subtotal + shippingCost - discount;

  // pré-preenche email/nome do usuário logado
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    if ((meta.full_name || meta.name) && !name) setName(meta.full_name || meta.name || "");
  }, [user]); // eslint-disable-line

  // hidrata rascunho salvo (uma vez)
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(DRAFT_KEY) : null;
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<Record<string, string>>;
      if (d.name) setName((v) => v || d.name!);
      if (d.email) setEmail((v) => v || d.email!);
      if (d.phone) setPhone((v) => v || d.phone!);
      if (d.cpf) setCpf((v) => v || d.cpf!);
      if (d.cep) setCep((v) => v || d.cep!);
      if (d.street) setStreet((v) => v || d.street!);
      if (d.number) setNumber((v) => v || d.number!);
      if (d.complement) setComplement((v) => v || d.complement!);
      if (d.district) setDistrict((v) => v || d.district!);
      if (d.city) setCity((v) => v || d.city!);
      if (d.stateUf) setStateUf((v) => v || d.stateUf!);
    } catch {
      // ignora rascunho corrompido
    }
  }, []); // eslint-disable-line

  // persiste rascunho a cada mudança (debounced simples)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ name, email, phone, cpf, cep, street, number, complement, district, city, stateUf }),
        );
      } catch {
        // quota / privacidade: silencia
      }

      // Sync abandoned cart
      if (email || phone) {
        void upsertAbandonedCart({
          customer_name: name || null,
          customer_email: email || null,
          customer_phone: phone || null,
          cart_data: { items },
          subtotal: +subtotal.toFixed(2),
          shipping_cost: +shippingCost.toFixed(2),
          discount: +discount.toFixed(2),
          total: +total.toFixed(2),
        });
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [name, email, phone, cpf, cep, street, number, complement, district, city, stateUf, items, subtotal, shippingCost, discount, total]);


  // auto-preenche endereço assim que o CEP fica completo (8 dígitos)
  useEffect(() => {
    const c = onlyDigits(cep);
    if (c.length !== 8) return;
    let cancelled = false;
    setCepLoading(true);
    (async () => {
      const data = await lookupCep(c);
      if (cancelled) return;
      setCepLoading(false);
      if (!data) { toast.error("CEP não encontrado. Verifique e tente novamente."); return; }
      setStreet((prev) => data.logradouro || prev);
      setDistrict((prev) => data.bairro || prev);
      setCity(data.localidade || "");
      setStateUf(data.uf || "");
      toast.success("Endereço encontrado — calculando frete…");
    })();
    return () => { cancelled = true; };
  }, [cep]);

  // cotação de frete sempre que CEP/cidade/subtotal mudam
  useEffect(() => {
    const c = onlyDigits(cep);
    if (c.length !== 8) { setQuotes([]); setShippingCode(""); setQuotesLoading(false); return; }
    let cancelled = false;
    setQuotesLoading(true);
    (async () => {
      const q = await shipping.quote({ cep: c, subtotal, itemsCount, city, state: stateUf });
      if (cancelled) return;
      setQuotesLoading(false);
      setQuotes(q);
      if (q.length && !q.find((x) => x.code === shippingCode)) setShippingCode(q[0].code);
    })();
    return () => { cancelled = true; };
  }, [cep, city, stateUf, subtotal, itemsCount]); // eslint-disable-line

  const onCepBlur = async () => {
    // fallback caso o efeito não tenha rodado (ex.: colar sem disparar change)
    const c = onlyDigits(cep);
    if (c.length !== 8 || street) return;
    setCepLoading(true);
    const data = await lookupCep(c);
    setCepLoading(false);
    if (!data) { toast.error("CEP não encontrado"); return; }
    setStreet(data.logradouro || street);
    setDistrict(data.bairro || district);
    setCity(data.localidade || city);
    setStateUf(data.uf || stateUf);
  };

  // Polling do status do PIX enquanto o modal está aberto (a cada 4s, até 15 min).
  useEffect(() => {
    if (!pix || pix.status !== "aguardando") return;
    let cancelled = false;
    const start = Date.now();
    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - start > 15 * 60 * 1000) {
        setPix((p) => (p ? { ...p, status: "expirado" } : p));
        return;
      }
      try {
        const r = await getMpPaymentStatus({ data: { paymentId: pix.paymentId } });
        if (cancelled) return;
        if (r.status === "approved") {
          setPix((p) => (p ? { ...p, status: "pago" } : p));
          clearCart();
          toast.success("Pagamento confirmado!");
          setTimeout(() => {
            navigate({ to: "/pedido/sucesso/$numero", params: { numero: pix.orderNumber } });
          }, 1200);
          return;
        }
        if (["rejected", "cancelled", "refunded"].includes(r.status)) {
          setPix((p) => (p ? { ...p, status: "erro" } : p));
          return;
        }
      } catch (e) {
        console.warn("polling pix:", e);
      }
      pollRef.current = window.setTimeout(tick, 4000);
    };
    pollRef.current = window.setTimeout(tick, 4000);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [pix?.paymentId, pix?.status]); // eslint-disable-line

  const canSubmit =
    items.length > 0 &&
    name.trim().length >= 2 &&
    /.+@.+\..+/.test(email) &&
    onlyDigits(cep).length === 8 &&
    street && number && district && city && stateUf &&
    shippingCode && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const parsed = checkoutSchema.safeParse({
      name, email, phone, cpf,
      cep: onlyDigits(cep), street, number, complement,
      district, city, stateUf, shippingCode,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const v = parsed.data;
    setSubmitting(true);
    setSubmitStage("creating");
    try {
      const order = await createOrder({
        customer: {
          name: v.name,
          email: v.email,
          phone: onlyDigits(v.phone ?? "") || undefined,
          cpf: onlyDigits(v.cpf ?? "") || undefined,
          user_id: user?.id ?? null,
        },
        address: {
          cep: v.cep,
          street: v.street, number: v.number, complement: v.complement || undefined,
          district: v.district, city: v.city, state: v.stateUf,
        },
        items: items.map((i) => ({
          product_id: null, // mapping para uuid real (opcional)
          product_name: i.product.node.title,
          variant_size: i.selectedOptions.find((o) => /tam|size/i.test(o.name))?.value,
          variant_color: i.selectedOptions.find((o) => /cor|color/i.test(o.name))?.value,
          unit_price: parseFloat(i.price.amount),
          quantity: i.quantity,
        })),
        subtotal: +subtotal.toFixed(2),
        shipping_cost: +shippingCost.toFixed(2),
        shipping_method: selectedQuote?.name ?? "",
        discount: +discount.toFixed(2),
        total: +total.toFixed(2),
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code,
      });

      // Pagamento
      setSubmitStage("processing");

      if (paymentMethod === "pix") {
        // PIX inline: cria pagamento direto e exibe QR Code no próprio checkout.
        try {
          const pixRes = await createMpPixPayment({
            data: {
              orderId: order.id,
              orderNumber: order.order_number,
              amount: order.total,
              siteUrl: window.location.origin,
              customer: {
                name: v.name,
                email: v.email,
                cpf: onlyDigits(v.cpf ?? "") || undefined,
                phone: onlyDigits(v.phone ?? "") || undefined,
              },
            },
          });
          await supabase.rpc("attach_order_payment", {
            p_order_id: order.id,
            p_provider: pixRes.provider,
            p_payment_id: pixRes.paymentId,
          });
          setPix({
            orderNumber: order.order_number,
            paymentId: pixRes.paymentId,
            qrCode: pixRes.qrCode,
            qrCodeBase64: pixRes.qrCodeBase64,
            status: "aguardando",
          });
          try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
          toast.success("PIX gerado — escaneie ou copie o código.");
          setSubmitStage("idle");
          setSubmitting(false);
          return;
        } catch (e) {
          console.error(e);
          toast.error("Não foi possível gerar o PIX", { description: (e as Error).message });
          setSubmitStage("idle");
          setSubmitting(false);
          return;
        }
      }

      // Cartão: abre Card Payment Brick inline (checkout transparente).
      if (paymentMethod === "cartao") {
        setCard({
          orderId: order.id,
          orderNumber: order.order_number,
          amount: order.total,
          email: v.email,
        });
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        toast.success("Pedido criado — preencha os dados do cartão.");
        setSubmitStage("idle");
        setSubmitting(false);
        return;
      }

      // Boleto: continua via Checkout Pro (redirect).
      let paymentUrl: string | undefined;
      try {
        const pay = await payment.createPayment({
          orderId: order.id,
          orderNumber: order.order_number,
          amount: order.total,
          method: paymentMethod,
          customer: { name, email, cpf: onlyDigits(cpf) || undefined, phone: onlyDigits(phone) || undefined },
        });
        paymentUrl = pay.paymentUrl;
        await supabase.rpc("attach_order_payment", {
          p_order_id: order.id,
          p_provider: pay.provider,
          p_payment_id: pay.paymentId,
          p_payment_url: pay.paymentUrl ?? undefined,
        });
      } catch (e) {
        console.warn("Pagamento não pôde ser criado:", e);
        toast.warning("Pedido criado, mas o pagamento não pôde ser iniciado agora.", {
          description: "Você poderá pagar pela página do pedido.",
        });
      }

      setSubmitStage("redirecting");
      clearCart();
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success("Pedido criado!", { description: order.order_number });

      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }
      navigate({ to: "/pedido/sucesso/$numero", params: { numero: order.order_number }, search: { email: v.email } });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível finalizar o pedido", { description: (e as Error).message });
      setSubmitStage("idle");
    } finally {
      setSubmitting(false);
    }
  };


  const stageMessage =
    submitStage === "creating" ? "Criando seu pedido…"
    : submitStage === "processing" ? "Processando pagamento…"
    : submitStage === "redirecting" ? "Tudo pronto! Redirecionando…"
    : "";

  // progresso baseado no preenchimento
  const stepIdentDone = name.trim().length >= 2 && /.+@.+\..+/.test(email);
  const stepAddrDone = onlyDigits(cep).length === 8 && !!street && !!number && !!district && !!city && !!stateUf;
  const stepShipDone = !!shippingCode;
  const stepPayDone = stepShipDone; // sempre há um método selecionado

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-display text-3xl">Sua sacola está vazia</h1>
          <p className="text-sm text-muted-foreground mt-3">Adicione produtos antes de finalizar a compra.</p>
          <button onClick={() => navigate({ to: "/" })} className="mt-6 bg-foreground text-background px-8 py-3 text-[11px] tracking-[0.25em] uppercase">
            Ir para a loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">Finalizar Compra</h1>
        <p className="text-sm text-muted-foreground mt-1">Preencha seus dados para concluir o pedido.</p>

        {/* Progresso do checkout */}
        <ol
          aria-label="Etapas do checkout"
          className="mt-6 grid grid-cols-4 gap-2 sm:gap-3"
        >
          {[
            { label: "Identificação", done: stepIdentDone },
            { label: "Endereço", done: stepAddrDone },
            { label: "Frete", done: stepShipDone },
            { label: "Pagamento", done: stepPayDone },
          ].map((s, i) => (
            <li key={s.label} className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  s.done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`text-[11px] sm:text-xs truncate ${s.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        <fieldset disabled={submitting} className="grid lg:grid-cols-[1fr_380px] gap-8 mt-8 disabled:opacity-70 border-0 p-0 m-0">
          <div className="space-y-8">
            {/* Identificação */}
            <Section icon={<User className="h-4 w-4" />} title="Seus dados">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nome completo *">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="Maria Silva" />
                </Field>
                <Field label="E-mail *">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} placeholder="voce@email.com" />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} placeholder="(47) 99999-9999" />
                </Field>
                <Field label="CPF">
                  <input value={cpf} onChange={(e) => setCpf(e.target.value)} className={inp} placeholder="000.000.000-00" />
                </Field>
              </div>
            </Section>

            {/* Endereço */}
            <Section icon={<MapPin className="h-4 w-4" />} title="Endereço de entrega">
              <div className="grid sm:grid-cols-[180px_1fr] gap-3">
                <Field label="CEP *">
                  <div className="relative">
                    <input
                      value={cep}
                      onChange={(e) => setCep(formatCep(e.target.value))}
                      onBlur={onCepBlur}
                      className={inp}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                    />
                    {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </Field>
                <Field label="Rua *">
                  <input value={street} onChange={(e) => setStreet(e.target.value)} className={inp} />
                </Field>
                <Field label="Número *">
                  <input value={number} onChange={(e) => setNumber(e.target.value)} className={inp} />
                </Field>
                <Field label="Complemento">
                  <input value={complement} onChange={(e) => setComplement(e.target.value)} className={inp} placeholder="Apto, bloco…" />
                </Field>
                <Field label="Bairro *">
                  <input value={district} onChange={(e) => setDistrict(e.target.value)} className={inp} />
                </Field>
                <div className="grid grid-cols-[1fr_80px] gap-3">
                  <Field label="Cidade *">
                    <input value={city} onChange={(e) => setCity(e.target.value)} className={inp} />
                  </Field>
                  <Field label="UF *">
                    <input value={stateUf} onChange={(e) => setStateUf(e.target.value.toUpperCase())} className={inp} maxLength={2} />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Frete */}
            <Section icon={<Truck className="h-4 w-4" />} title="Frete">
              {onlyDigits(cep).length !== 8 ? (
                <p className="text-sm text-muted-foreground">Informe o CEP para ver as opções de entrega.</p>
              ) : quotesLoading || quotes.length === 0 ? (
                <div className="space-y-2" aria-live="polite" aria-busy="true">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Calculando opções de entrega…
                  </p>
                  {[0, 1, 2].map((k) => (
                    <div key={k} className="flex items-center justify-between border border-border rounded-md p-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-4 w-4 rounded-full bg-secondary animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
                          <div className="h-2.5 w-48 bg-secondary/70 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-4 w-14 bg-secondary rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <label key={q.code} className={`flex items-center justify-between border rounded-md p-3 cursor-pointer transition ${shippingCode === q.code ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="ship" checked={shippingCode === q.code} onChange={() => setShippingCode(q.code)} />
                        <div>
                          <p className="text-sm font-medium">{q.name}</p>
                          <p className="text-xs text-muted-foreground">{q.description ?? `Entrega em até ${q.days} dia${q.days > 1 ? "s" : ""} úteis`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-sm font-semibold">
                          {q.code === "cotacao" ? "A consultar" : q.price === 0 ? "Grátis" : formatPrice(q.price, "BRL")}
                        </span>
                        {q.code !== "cotacao" && (
                          <span className="block text-[11px] text-muted-foreground mt-0.5">
                            Chega {estimatedDeliveryLabel(q.days)}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </Section>

            {/* Pagamento */}
            <Section icon={<CreditCard className="h-4 w-4" />} title="Pagamento">
              <div className="grid sm:grid-cols-3 gap-2">
                {(["pix", "cartao", "boleto"] as PaymentMethod[]).map((m) => (
                  <label key={m} className={`border rounded-md p-3 cursor-pointer text-sm font-medium text-center transition ${paymentMethod === m ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40"}`}>
                    <input type="radio" name="pm" className="hidden" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                    {m === "pix" ? "Pix" : m === "cartao" ? "Cartão de crédito" : "Boleto"}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Pagamento processado com segurança pelo Mercado Pago.{" "}
                {paymentMethod === "pix"
                  ? "O QR Code é gerado aqui mesmo, sem sair do site."
                  : paymentMethod === "cartao"
                    ? "Você digita os dados do cartão diretamente nesta página."
                    : "Você será redirecionado para concluir o pagamento do boleto."}
              </p>
            </Section>
          </div>

          {/* Resumo */}
          <aside className="lg:sticky lg:top-28 lg:self-start space-y-4">
            <div className="border border-border rounded-md p-5 bg-secondary/30">
              <h2 className="font-display text-lg mb-4">Resumo</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {items.map((i) => (
                  <div key={i.variantId} className="flex gap-3 text-sm">
                    <div className="w-12 h-16 bg-secondary overflow-hidden flex-shrink-0">
                      {i.product.node.images?.edges?.[0]?.node && (
                        <img src={i.product.node.images.edges[0].node.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2">{i.product.node.title}</p>
                      <p className="text-xs text-muted-foreground">{i.quantity}× · {i.selectedOptions.map((o) => o.value).join(" · ")}</p>
                    </div>
                    <span className="text-sm font-medium">{formatPrice(parseFloat(i.price.amount) * i.quantity, "BRL")}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-border space-y-2 text-sm">
                <Row label="Subtotal" value={formatPrice(subtotal, "BRL")} />
                <Row
                  label="Frete"
                  value={
                    selectedQuote?.code === "cotacao"
                      ? "A consultar"
                      : shippingCost === 0
                        ? "Grátis"
                        : formatPrice(shippingCost, "BRL")
                  }
                  muted={!shippingCode}
                />
                {selectedQuote && selectedQuote.code !== "cotacao" && (
                  <Row
                    label="Previsão de entrega"
                    value={estimatedDeliveryLabel(selectedQuote.days)}
                    muted
                  />
                )}
                {appliedCoupon && (
                  <Row 
                    label={`Cupom (${appliedCoupon.code})`} 
                    value={`-${formatPrice(discount, "BRL")}`} 
                    className="text-emerald-500 font-medium"
                  />
                )}
                <Row label="Total" value={formatPrice(total, "BRL")} bold />
              </div>

              {!appliedCoupon ? (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Cupom de desconto"
                    className="flex-1 h-9 px-3 rounded border border-border bg-background text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode}
                    className="h-9 px-4 bg-secondary text-foreground text-[10px] uppercase font-bold rounded hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {validatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase">
                    <Ticket className="h-3 w-3" /> {appliedCoupon.code}
                  </div>
                  <button onClick={removeCoupon} className="p-1 hover:text-red-500 transition">
                    <CloseIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                aria-live="polite"
                className="w-full mt-5 bg-foreground text-background h-12 text-[11px] tracking-[0.25em] uppercase font-medium hover:bg-foreground/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="tracking-normal normal-case text-xs">{stageMessage}</span>
                  </>
                ) : (
                  <>Finalizar pedido <ChevronRight className="h-4 w-4" /></>
                )}
              </button>
              {submitting && (
                <p aria-live="polite" className="mt-2 text-[11px] text-muted-foreground text-center">
                  Não feche esta janela — estamos processando seu pedido.
                </p>
              )}
              <p className="mt-3 text-[10px] text-muted-foreground text-center">
                Ao finalizar você concorda com nossos termos e política de privacidade.
              </p>
            </div>
          </aside>
        </fieldset>
      </div>

      {pix && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pix-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-background rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="h-5 w-5 text-primary" />
              <h2 id="pix-title" className="font-display text-xl">Pague com PIX</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Pedido <span className="font-medium text-foreground">{pix.orderNumber}</span> · Total {formatPrice(total, "BRL")}
            </p>

            {pix.status === "aguardando" && (
              <>
                {pix.qrCodeBase64 ? (
                  <div className="flex justify-center bg-white rounded-md p-3 border border-border">
                    <img
                      src={`data:image/png;base64,${pix.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="h-56 w-56 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando QR Code…
                  </div>
                )}

                {pix.qrCode && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">PIX copia e cola</label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={pix.qrCode}
                        className="flex-1 h-10 px-3 rounded-md border border-border bg-secondary/30 text-xs font-mono truncate"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(pix.qrCode!);
                            toast.success("Código copiado!");
                          } catch {
                            toast.error("Não foi possível copiar");
                          }
                        }}
                        className="h-10 px-3 rounded-md bg-foreground text-background text-xs font-medium inline-flex items-center gap-1"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copiar
                      </button>
                    </div>
                  </div>
                )}

                <p className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando confirmação do pagamento… você será redirecionado automaticamente.
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  O código expira em 30 minutos.
                </p>
              </>
            )}

            {pix.status === "pago" && (
              <div className="py-6 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <Check className="h-6 w-6" />
                </div>
                <p className="font-medium">Pagamento confirmado!</p>
                <p className="text-xs text-muted-foreground mt-1">Redirecionando para o resumo do pedido…</p>
              </div>
            )}

            {(pix.status === "expirado" || pix.status === "erro") && (
              <div className="py-6 text-center">
                <p className="font-medium">
                  {pix.status === "expirado" ? "O código PIX expirou." : "O pagamento não foi concluído."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você pode acompanhar ou refazer pela página do pedido.
                </p>
                <button
                  onClick={() => navigate({ to: "/pedido/sucesso/$numero", params: { numero: pix.orderNumber } })}
                  className="mt-4 h-10 px-4 rounded-md bg-foreground text-background text-xs uppercase tracking-widest"
                >
                  Ver meu pedido
                </button>
              </div>
            )}

            {pix.status !== "pago" && (
              <button
                onClick={() => setPix(null)}
                className="mt-4 w-full text-[11px] text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      )}

      {card && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto overscroll-contain"
        >
          <div className="bg-background w-full sm:max-w-lg rounded-t-2xl sm:rounded-lg p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:my-8 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-5 w-5 text-primary shrink-0" />
              <h2 id="card-title" className="font-display text-lg sm:text-xl">Pagamento com cartão</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4 break-words">
              Pedido <span className="font-medium text-foreground">{card.orderNumber}</span> · Total {formatPrice(card.amount, "BRL")}
            </p>

            <CardBrickPayment
              amount={card.amount}
              payerEmail={card.email}
              onSubmit={async (data: CardBrickFormData) => {
                const pay = await createMpCardPayment({
                  data: {
                    orderId: card.orderId,
                    orderNumber: card.orderNumber,
                    amount: card.amount,
                    siteUrl: window.location.origin,
                    token: data.token,
                    installments: data.installments,
                    paymentMethodId: data.payment_method_id,
                    issuerId: data.issuer_id,
                    payer: {
                      email: data.payer.email ?? card.email,
                      identification: data.payer.identification,
                    },
                  },
                });
                await supabase.rpc("attach_order_payment", {
                  p_order_id: card.orderId,
                  p_provider: pay.provider,
                  p_payment_id: pay.paymentId,
                });

                if (pay.status === "approved") {
                  clearCart();
                  toast.success("Pagamento aprovado!");
                  navigate({ to: "/pedido/sucesso/$numero", params: { numero: card.orderNumber } });
                  return;
                }
                if (pay.status === "in_process" || pay.status === "pending") {
                  clearCart();
                  toast.info("Pagamento em análise — acompanhe pelo pedido.");
                  navigate({ to: "/pedido/sucesso/$numero", params: { numero: card.orderNumber } });
                  return;
                }
                throw new Error(pay.statusDetail ?? "Pagamento não autorizado. Tente outro cartão.");
              }}
            />

            <button
              onClick={() => setCard(null)}
              className="mt-4 w-full text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancelar e voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border rounded-md p-5 bg-background">
      <h2 className="font-display text-lg mb-4 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, bold, muted, className }: { label: string; value: string; bold?: boolean; muted?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold pt-2 border-t border-border" : ""} ${muted ? "text-muted-foreground" : ""} ${className || ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
