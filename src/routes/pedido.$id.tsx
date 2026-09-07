import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  CheckCircle2, Clock, Loader2, MessageCircle, Package, RefreshCw, MapPin,
} from "lucide-react";
import { getOrderPublic } from "@/lib/api/orderTracking";
import {
  FULFILLMENT_FLOW, FULFILLMENT_LABEL, FULFILLMENT_DESCRIPTION,
  type FulfillmentStage,
} from "@/lib/api/orderTracking";
import { FulfillmentStepper } from "@/components/FulfillmentStepper";
import { formatPrice, STORE_INFO, buildWhatsAppLink } from "@/lib/shopify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const searchSchema = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/pedido/$id")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `Pedido ${params.id} — Acompanhamento Soraia Fernandes` },
      { name: "description", content: "Acompanhe as etapas do seu pedido em tempo real." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PedidoTimelinePage,
});

function fmtDateBR(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function PedidoTimelinePage() {
  const { id } = Route.useParams();
  const { email: emailParam } = Route.useSearch();
  const qc = useQueryClient();

  const [emailInput, setEmailInput] = useState(emailParam ?? "");
  const [confirmedEmail, setConfirmedEmail] = useState(emailParam ?? "");

  const { data: order, isLoading, refetch, isFetching, error } = useQuery({
    enabled: !!confirmedEmail,
    queryKey: ["order-public", id, confirmedEmail],
    queryFn: () => getOrderPublic(id, confirmedEmail),
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return false;
      if (d.status === "aguardando_pagamento") return 15000;
      if (d.fulfillment_status !== "entregue") return 30000;
      return false;
    },
  });

  useEffect(() => {
    if (!confirmedEmail) return;
    const ch = supabase
      .channel(`pedido-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_number=eq.${id}` },
        (payload) => {
          const next = payload.new as { fulfillment_status?: string; status?: string };
          const prev = payload.old as { fulfillment_status?: string; status?: string };
          if (next.fulfillment_status && next.fulfillment_status !== prev.fulfillment_status) {
            const label = FULFILLMENT_LABEL[next.fulfillment_status as FulfillmentStage] ?? next.fulfillment_status;
            toast.success(`Novo status: ${label}`);
          } else if (next.status && next.status !== prev.status) {
            toast.info("Pedido atualizado.");
          }
          qc.invalidateQueries({ queryKey: ["order-public", id, confirmedEmail] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, confirmedEmail, qc]);

  // Formulário se não há email
  if (!confirmedEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="font-display text-2xl mb-2">Acompanhar pedido</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Informe o e-mail usado na compra para acompanhar o pedido <strong>{id}</strong>.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = emailInput.trim();
            if (!v) return;
            setConfirmedEmail(v);
          }}
          className="space-y-3"
        >
          <input
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="seu@email.com"
            className="w-full h-11 px-3 rounded-md border border-border bg-background text-sm"
          />
          <button
            type="submit"
            className="w-full h-11 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Ver acompanhamento
          </button>
        </form>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600">Não conseguimos localizar seu pedido.</p>
        <button
          onClick={() => { setConfirmedEmail(""); }}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Tentar outro e-mail
        </button>
      </div>
    );
  }

  if (!order) throw notFound();

  const paid = order.status === "pago";
  const currentIdx = order.fulfillment_status
    ? FULFILLMENT_FLOW.indexOf(order.fulfillment_status)
    : -1;

  const waMsg = `Olá Soraia Fernandes! Sobre meu pedido *${order.order_number}*...`;
  const waLink = buildWhatsAppLink(waMsg);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Pedido</p>
        <h1 className="font-display text-3xl md:text-4xl">{order.order_number}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Feito em {fmtDateBR(order.created_at)}
          {order.paid_at ? ` · Pago em ${fmtDateBR(order.paid_at)}` : ""}
        </p>
      </div>

      {/* Stepper visual */}
      <div className="border border-border rounded-md p-5 sm:p-6 bg-background">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Etapas do pedido</h2>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
        <FulfillmentStepper current={order.fulfillment_status} paid={paid} />
        {!paid && (
          <p className="mt-4 text-xs text-amber-600 text-center">
            Aguardando confirmação do pagamento. Assim que for aprovado, começamos a preparar.
          </p>
        )}
      </div>

      {/* Timeline PT-BR detalhada */}
      <div className="mt-6 border border-border rounded-md p-5 sm:p-6 bg-background">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Linha do tempo
        </h2>
        <ol className="relative border-l-2 border-border ml-2 space-y-5">
          {FULFILLMENT_FLOW.map((stage, i) => {
            const done = paid && currentIdx >= i;
            const isCurrent = paid && currentIdx === i;
            const hist = order.fulfillment_history.find((h) => h.stage === stage);
            return (
              <li key={stage} className="ml-5">
                <span
                  className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 ${
                    done
                      ? "bg-primary border-primary"
                      : "bg-background border-border"
                  } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                />
                <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                  {i + 1}. {FULFILLMENT_LABEL[stage]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {FULFILLMENT_DESCRIPTION[stage]}
                </p>
                {hist && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Atualizado em {fmtDateBR(hist.at)}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Resumo */}
      <div className="mt-6 border border-border rounded-md p-5 sm:p-6 bg-background">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" /> Resumo
        </h2>
        <div className="divide-y divide-border">
          {order.items.map((i) => (
            <div key={i.id} className="py-2.5 flex justify-between text-sm">
              <span>
                {i.quantity}× {i.product_name}
                {(i.variant_size || i.variant_color) && (
                  <span className="text-muted-foreground">
                    {" · "}{[i.variant_size, i.variant_color].filter(Boolean).join(" / ")}
                  </span>
                )}
              </span>
              <span>{formatPrice(i.subtotal, "BRL")}</span>
            </div>
          ))}
        </div>
        <div className="pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span>{formatPrice(order.subtotal, "BRL")}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Frete{order.shipping_method ? ` (${order.shipping_method})` : ""}</span>
            <span>{order.shipping_cost === 0 ? "Grátis" : formatPrice(order.shipping_cost, "BRL")}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Desconto</span><span>− {formatPrice(order.discount, "BRL")}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-2 border-t border-border">
            <span>Total</span><span>{formatPrice(order.total, "BRL")}</span>
          </div>
        </div>
        {order.address && (
          <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Entrega
            </p>
            <p>{order.address.street}, {order.address.number}
              {order.address.complement ? ` — ${order.address.complement}` : ""}</p>
            <p>{order.address.district} · {order.address.city}/{order.address.state} · CEP {order.address.cep}</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
        </a>
        <Link
          to="/pedido/sucesso/$numero"
          params={{ numero: order.order_number }}
          search={{ email: confirmedEmail }}
          className="inline-flex items-center justify-center gap-2 border border-border px-5 py-2.5 rounded-md text-sm hover:bg-muted"
        >
          <CheckCircle2 className="h-4 w-4" /> Ver comprovante
        </Link>
      </div>

      <p className="mt-6 text-xs text-center text-muted-foreground">
        Dúvidas? {STORE_INFO.city} · {STORE_INFO.phone ?? ""}
      </p>
    </div>
  );
}
