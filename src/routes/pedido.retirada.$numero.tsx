import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Store, MapPin, Clock, IdCard, Package, MessageCircle, Copy,
  CheckCircle2, Loader2, ArrowLeft, CreditCard, PackageCheck, Home, Check,
} from "lucide-react";
import { toast } from "sonner";
import { getOrderPublic } from "@/lib/api/orderTracking";
import { getOrderByNumber } from "@/lib/api/supaOrders";
import { STORE_INFO, buildWhatsAppLink } from "@/lib/shopify";

const searchSchema = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/pedido/retirada/$numero")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `Retirada do pedido ${params.numero} — Soraia Fernandes` },
      { name: "description", content: "Instruções para retirar seu pedido na loja Soraia Fernandes em Joinville/SC." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PickupInstructionsPage,
});

const HOURS = [
  { d: "Segunda a Sexta", h: "09h às 18h30" },
  { d: "Sábado", h: "09h às 13h" },
  { d: "Domingo e feriados", h: "Fechado" },
];

function PickupInstructionsPage() {
  const { numero } = Route.useParams();
  const { email } = Route.useSearch();

  const { data: order, isLoading } = useQuery({
    queryKey: ["pickup-order", numero, email ?? ""],
    queryFn: async () => {
      if (email) return await getOrderPublic(numero, email);
      const o = await getOrderByNumber(numero);
      return o
        ? {
            order_number: o.order_number,
            status: o.status,
            fulfillment_status: (o as unknown as { fulfillment_status?: string | null }).fulfillment_status ?? null,
            customer: o.customer ? { name: o.customer.name } : null,
          }
        : null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!order) throw notFound();

  const isReady = order.fulfillment_status === "embalado" || order.fulfillment_status === "coletado";
  const isDone = order.fulfillment_status === "entregue";
  const waMsg = `Olá Soraia Fernandes! Quero retirar o pedido *${order.order_number}* na loja. Já está pronto?`;
  const waLink = buildWhatsAppLink(waMsg);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      toast.success("Código copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/pedido/acompanhar" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <Store className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl">Retirar na loja</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Pedido <span className="font-semibold text-foreground">{order.order_number}</span>
          {"customer" in order && order.customer?.name ? ` · ${order.customer.name}` : ""}
        </p>

        {isDone ? (
          <p className="inline-flex items-center gap-1.5 mt-3 text-xs bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 rounded-full px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Retirada concluída
          </p>
        ) : isReady ? (
          <p className="inline-flex items-center gap-1.5 mt-3 text-xs bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 rounded-full px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Pronto para retirar
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 mt-3 text-xs bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30 rounded-full px-3 py-1">
            <Clock className="h-3.5 w-3.5" /> Estamos preparando seu pedido
          </p>
        )}
      </div>

      {/* Timeline de retirada */}
      <PickupStepper
        paid={order.status === "pago"}
        fulfillment={order.fulfillment_status ?? null}
      />



      {/* Código do pedido */}
      <div className="mt-6 border-2 border-dashed border-primary/40 rounded-md p-5 bg-primary/5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary mb-2">
          📌 Apresente este código na loja
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-[180px] font-mono text-lg font-bold tracking-wider bg-background border border-border rounded px-3 py-2 text-center select-all">
            {order.order_number}
          </code>
          <button
            onClick={copyCode}
            className="inline-flex items-center justify-center gap-1.5 border border-border px-3 py-2 rounded-md text-xs font-medium hover:bg-background"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar
          </button>
        </div>
      </div>

      {/* Endereço */}
      <div className="mt-6 rounded-md border border-border overflow-hidden bg-background">
        <div className="p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" /> Endereço da loja
          </h2>
          <p className="text-sm font-medium">{STORE_INFO.name}</p>
          <p className="text-sm text-muted-foreground">{STORE_INFO.street}</p>
          <p className="text-sm text-muted-foreground">
            {STORE_INFO.city} — {STORE_INFO.region} · CEP {STORE_INFO.postalCode}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Telefone: {STORE_INFO.phone}</p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              `${STORE_INFO.street}, ${STORE_INFO.city}, ${STORE_INFO.region}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" /> Traçar rota no Google Maps
          </a>
        </div>
        <iframe
          title="Mapa Soraia Fernandes"
          src={STORE_INFO.mapsEmbed}
          className="w-full h-56 border-t border-border"
          loading="lazy"
        />
      </div>

      {/* Horários */}
      <div className="mt-6 rounded-md border border-border bg-background p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" /> Horário de atendimento
        </h2>
        <ul className="text-sm divide-y divide-border">
          {HOURS.map((h) => (
            <li key={h.d} className="flex justify-between py-2">
              <span className="text-muted-foreground">{h.d}</span>
              <span className="font-medium">{h.h}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* O que trazer */}
      <div className="mt-6 rounded-md border border-border bg-background p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <IdCard className="h-4 w-4 text-primary" /> O que trazer
        </h2>
        <ul className="text-sm space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>Documento com foto (RG ou CNH) do titular do pedido.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>Número do pedido: <strong>{order.order_number}</strong>.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>Se outra pessoa for retirar, envie autorização com foto do documento do titular.</span>
          </li>
        </ul>
      </div>

      {/* Como funciona */}
      <div className="mt-6 rounded-md border border-border bg-background p-5">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-primary" /> Como funciona
        </h2>
        <ol className="text-sm space-y-2 list-decimal ml-5">
          <li>Assim que seu pedido estiver embalado, você recebe um aviso.</li>
          <li>Vá até a loja no horário de atendimento com o código e o documento.</li>
          <li>Nossa equipe confere e libera a retirada em minutos.</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Prefere confirmar antes de ir? Chame no WhatsApp que a gente avisa quando estiver pronto.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
        </a>
        <Link
          to="/pedido/sucesso/$numero"
          params={{ numero: order.order_number }}
          search={email ? { email } : {}}
          className="inline-flex items-center gap-2 border border-border px-5 py-2.5 rounded-md text-sm hover:bg-muted"
        >
          Ver status completo
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Stepper compacto: Aguardando pagto → Separado → Pronto p/ retirar → Concluída
// ---------------------------------------------------------------------
type PickupStep = { key: string; label: string; Icon: typeof Package };
const PICKUP_STEPS: PickupStep[] = [
  { key: "pagto", label: "Aguardando pagamento", Icon: CreditCard },
  { key: "separado", label: "Separado", Icon: PackageCheck },
  { key: "pronto", label: "Pronto para retirar", Icon: Store },
  { key: "concluida", label: "Concluída", Icon: Home },
];

function pickupStepIndex(paid: boolean, fulfillment: string | null): number {
  if (fulfillment === "entregue") return 3;
  if (
    fulfillment === "pronto_retirada" ||
    fulfillment === "coletado" ||
    fulfillment === "enviado" ||
    fulfillment === "em_transito"
  ) return 2;
  if (fulfillment === "embalado" || fulfillment === "recebido") return 1;
  if (paid) return 1; // pago mas sem etapa registrada ainda → já saiu de "aguardando"
  return 0;
}

function PickupStepper({ paid, fulfillment }: { paid: boolean; fulfillment: string | null }) {
  const currentIdx = pickupStepIndex(paid, fulfillment);
  return (
    <section aria-label="Progresso da retirada" className="mt-6 rounded-md border border-border bg-background p-5">
      <h2 className="text-sm font-semibold mb-4">Progresso da retirada</h2>
      <ol className="grid grid-cols-4 gap-1 sm:gap-3">
        {PICKUP_STEPS.map((s, i) => {
          const done = currentIdx > i;
          const isCurrent = currentIdx === i;
          const Icon = s.Icon;
          return (
            <li key={s.key} className="flex flex-col items-center text-center">
              <div
                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border-2 transition ${
                  done || isCurrent
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border"
                } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`mt-2 text-[10px] sm:text-xs font-medium leading-tight ${
                  done || isCurrent ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[11px] text-center text-muted-foreground">
        {currentIdx === 0 && "Assim que o pagamento for aprovado, começamos a separar seu pedido."}
        {currentIdx === 1 && "Estamos separando e embalando seus itens."}
        {currentIdx === 2 && "Seu pedido está aguardando você na loja. Traga o código e um documento."}
        {currentIdx === 3 && "Retirada concluída. Obrigada pela preferência! 💛"}
      </p>
    </section>
  );
}
