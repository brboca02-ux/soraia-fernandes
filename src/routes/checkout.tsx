import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, CreditCard, User, ChevronRight, Truck, Check, Lock, Ticket, X as CloseIcon } from "lucide-react";
import { z } from "zod";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/shopify";
import { shipping, type ShippingQuote } from "@/lib/integrations/shipping";
import { payment } from "@/lib/integrations/payment";
import { lookupCep, formatCep } from "@/lib/integrations/viacep";
import { createOrder } from "@/lib/api/supaOrders";
import { supabase } from "@/integrations/supabase/client";
import { validateCoupon, calculateDiscount, type Coupon } from "@/lib/coupons";
import { upsertAbandonedCart } from "@/lib/api/abandoned";
import type { ReactNode } from "react";

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [shippingCode, setShippingCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<"idle" | "creating" | "processing" | "redirecting" | "error">("idle");
  const [showExitOffer, setShowExitOffer] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

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
    [items]
  );
  const itemsCount = items.reduce((s, i) => s + i.quantity, 0);
  const selectedQuote = quotes.find((q) => q.code === shippingCode);
  const shippingCost = selectedQuote?.price ?? 0;
  const automaticDiscount = subtotal > 439.90 ? subtotal - 439.90 : 0;
  const couponDiscount = appliedCoupon
    ? calculateDiscount(subtotal, appliedCoupon)
    : 0;
  const discount = automaticDiscount + couponDiscount;
  const total = subtotal + shippingCost - discount;

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    if ((meta.full_name || meta.name) && !name) setName(meta.full_name || meta.name || "");
  }, [user]);

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
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ name, email, phone, cpf, cep, street, number, complement, district, city, stateUf })
        );
      } catch {}

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

  useEffect(() => {
    const c = onlyDigits(cep);
    if (c.length !== 8) return;
    let cancelled = false;
    setCepLoading(true);
    (async () => {
      const data = await lookupCep(c);
      if (cancelled) return;
      setCepLoading(false);
      if (!data) {
        toast.error("CEP não encontrado. Verifique e tente novamente.");
        return;
      }
      setStreet((prev) => data.logradouro || prev);
      setDistrict((prev) => data.bairro || prev);
      setCity(data.localidade || "");
      setStateUf(data.uf || "");
      toast.success("Endereço encontrado — calculando frete…");
    })();
    return () => {
      cancelled = true;
    };
  }, [cep]);

  useEffect(() => {
    const c = onlyDigits(cep);
    if (c.length !== 8) {
      setQuotes([]);
      setShippingCode("");
      setQuotesLoading(false);
      return;
    }
    let cancelled = false;
    setQuotesLoading(true);
    (async () => {
      const q = await shipping.quote({ cep: c, subtotal, itemsCount, city, state: stateUf });
      if (cancelled) return;
      setQuotesLoading(false);
      setQuotes(q);
      if (q.length && !q.find((x) => x.code === shippingCode)) setShippingCode(q[0].code);
    })();
    return () => {
      cancelled = true;
    };
  }, [cep, city, stateUf, subtotal, itemsCount]);

  useEffect(() => {
  const handleMouseLeave = (event: MouseEvent) => {
    if (event.clientY <= 0 && !submitting) {
      const alreadyShown = sessionStorage.getItem("checkout_exit_offer");

      if (!alreadyShown) {
        sessionStorage.setItem("checkout_exit_offer", "1");
        setShowExitOffer(true);
      }
    }
    } ;

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
    document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [submitting]);

  const onCepBlur = async () => {
    const c = onlyDigits(cep);
    if (c.length !== 8 || street) return;
    setCepLoading(true);
    const data = await lookupCep(c);
    setCepLoading(false);
    if (!data) {
      toast.error("CEP não encontrado");
      return;
    }
    setStreet(data.logradouro || street);
    setDistrict(data.bairro || district);
    setCity(data.localidade || city);
    setStateUf(data.uf || stateUf);
  };

  const canSubmit =
    items.length > 0 &&
    name.trim().length >= 2 &&
    /.+@.+\..+/.test(email) &&
    onlyDigits(cep).length === 8 &&
    street &&
    number &&
    district &&
    city &&
    stateUf &&
    shippingCode &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const parsed = checkoutSchema.safeParse({
      name,
      email,
      phone,
      cpf,
      cep: onlyDigits(cep),
      street,
      number,
      complement,
      district,
      city,
      stateUf,
      shippingCode,
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
          street: v.street,
          number: v.number,
          complement: v.complement || undefined,
          district: v.district,
          city: v.city,
          state: v.stateUf,
        },
        items: items.map((i) => {
          let rawId = (i as any).productId || (i as any).product_id || i.product?.node?.id || i.variantId || "";
          let cleanId = typeof rawId === "string" ? rawId.split("/").pop() || "" : String(rawId);
          cleanId = cleanId.replace(/^mock:/, "");

          return {
            product_id: cleanId || null,
            product_name: i.product?.node?.title || "Produto",
            variant_size: i.selectedOptions?.find((o) => /tam|size/i.test(o.name))?.value || undefined,
            variant_color: i.selectedOptions?.find((o) => /cor|color/i.test(o.name))?.value || undefined,
            unit_price: parseFloat(i.price?.amount || "0"),
            quantity: i.quantity,
          };
        }),
        subtotal: +subtotal.toFixed(2),
        shipping_cost: +shippingCost.toFixed(2),
        shipping_method: selectedQuote?.name ?? "",
        discount: +discount.toFixed(2),
        total: +total.toFixed(2),
        payment_method: "infinitepay",
        coupon_code: appliedCoupon?.code,
      });

          setSubmitStage("processing");

          let paymentUrl: string | undefined;

          try {
            const pay = await payment.createPayment({
              orderId: order.id,
              orderNumber: order.order_number,
              amount: order.total,
              customer: {
                name: v.name,
                email: v.email,
                cpf: onlyDigits(v.cpf ?? "") || undefined,
                phone: onlyDigits(v.phone ?? "") || undefined,
              },
            });

            // Sem URL, não existe checkout para onde redirecionar.
            if (!pay?.paymentUrl) {
              throw new Error("A InfinitePay não retornou uma URL de pagamento.");
            }

            paymentUrl = pay.paymentUrl;

            await supabase.rpc("attach_order_payment", {
              p_order_id: order.id,
              p_provider: pay.provider,
              p_payment_id: pay.paymentId,
              p_payment_url: pay.paymentUrl,
            });
            } catch (e: any) {
            console.error("Pagamento não pôde ser iniciado:", e);
            setSubmitStage("error");
            toast.error("Não foi possível iniciar o pagamento.", {
              description: "O pagamento não foi iniciado. Tente novamente.",
            });
            return;
          }

          setSubmitStage("redirecting");
            clearCart();
            try {
              localStorage.removeItem(DRAFT_KEY);
            } catch {}
            toast.success("Pedido criado!", { description: order.order_number });
            window.location.href = paymentUrl;
            
            return;

            }
            catch (e) {
            console.error(e);
            toast.error("Não foi possível finalizar o pedido", { description: (e as Error).message });
            setSubmitStage("idle");
          } finally {
            setSubmitting(false);
          }
        };

  const stageMessage =
    submitStage === "creating"
      ? "Criando seu pedido…"
      : submitStage === "processing"
      ? "Gerando link de pagamento InfinitePay…"
      : submitStage === "redirecting"
      ? "Redirecionando para pagamento seguro…"
      : "";

  const stepIdentDone = name.trim().length >= 2 && /.+@.+\..+/.test(email);
  const stepAddrDone = onlyDigits(cep).length === 8 && !!street && !!number && !!district && !!city && !!stateUf;
  const stepShipDone = !!shippingCode;

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
{showExitOffer && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="exit-offer-title"
    onClick={() => setShowExitOffer(false)}
  >
    <div
      className="relative grid w-full max-w-2xl max-h-[90dvh] grid-cols-1 overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl md:grid-cols-2 md:overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Botão fechar */}
      <button
        type="button"
        onClick={() => setShowExitOffer(false)}
        aria-label="Fechar oferta"
        className="absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
      >
        <CloseIcon className="h-4 w-4" />
      </button>

      {/* COLUNA ESQUERDA: IMAGEM */}
      <div className="relative min-h-[220px] overflow-hidden bg-secondary md:min-h-[480px]">
        {items[0]?.product?.node?.images?.edges?.[0]?.node?.url ? (
          <img
            src={items[0].product.node.images.edges[0].node.url}
            alt={
              items[0].product.node.title ||
              "Produto no carrinho"
            }
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              Produto
            </span>
          </div>
        )}

        {/* Selo da oferta */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16">
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">
            Oferta especial
          </span>
        </div>
      </div>

      {/* COLUNA DIREITA: TODO O CONTEÚDO */}
      <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7 md:p-8">

        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Oferta promocional
        </p>

        <h2
          id="exit-offer-title"
          className="mt-3 font-display text-2xl leading-tight sm:text-3xl"
        >
          Espere! Não perca seu preço promocional
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Seu produto está com uma condição promocional
          especial. Aproveite agora antes de sair desta página.
        </p>

        {/* Preço */}
        <div className="mt-5 rounded-lg bg-secondary/50 p-4">
          <p className="text-xs text-muted-foreground">
            Preço promocional
          </p>

          <p className="mt-1 text-3xl font-semibold">
            {formatPrice(439.90, "BRL")}
          </p>
        </div>

        {/* Botão principal */}
        <button
          type="button"
          onClick={() => setShowExitOffer(false)}
          className="mt-5 flex min-h-12 w-full items-center justify-center bg-foreground px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.15em] text-background transition hover:bg-foreground/90"
        >
          Continuar minha compra
        </button>

        {/* Botão secundário */}
        <button
          type="button"
          onClick={() => setShowExitOffer(false)}
          className="mt-3 w-full py-2 text-center text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
        >
          Quero sair mesmo assim
        </button>

      </div>
    </div>
  </div>