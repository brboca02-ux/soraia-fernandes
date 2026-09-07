import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { getOrderByNumber, type OrderFull } from "@/lib/api/supaOrders";
import { supabase } from "@/integrations/supabase/client";
import {
  FULFILLMENT_FLOW,
  FULFILLMENT_LABEL,
  setOrderFulfillment,
  type FulfillmentStage,
  type FulfillmentHistoryEntry,
} from "@/lib/api/orderTracking";
import { FulfillmentStepper } from "@/components/FulfillmentStepper";
import { formatPrice } from "@/lib/shopify";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos/rastreio/$id")({
  head: () => ({
    meta: [
      { title: "Rastreio do pedido — Soraia Fernandes" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TrackingAdminPage,
});

interface OrderWithFulfillment extends OrderFull {
  fulfillment_status: FulfillmentStage | null;
  fulfillment_history: FulfillmentHistoryEntry[];
}

async function loadOrderById(id: string): Promise<OrderWithFulfillment | null> {
  // Busca por id (getOrderByNumber é por número); usamos select direto.
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, subtotal, shipping_cost, discount, total,
      payment_method, payment_provider, payment_url, shipping_method, tracking_code,
      notes, created_at, paid_at,
      fulfillment_status, fulfillment_history,
      customer:customers(id, name, email, phone, cpf),
      address:addresses(cep, street, number, complement, district, city, state),
      items:order_items(id, product_name, variant_size, variant_color, unit_price, quantity, subtotal)
    `)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as OrderWithFulfillment | null;
}

function TrackingAdminPage() {
  const { id } = useParams({ from: "/pedidos/rastreio/$id" });
  const qc = useQueryClient();
  const [busy, setBusy] = useState<FulfillmentStage | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => loadOrderById(id),
  });

  if (isLoading) {
    return (
      <AdminShell active="pedidos">
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }
  if (!order) throw notFound();

  const paid = order.status === "pago";

  async function apply(stage: FulfillmentStage) {
    if (!paid) {
      toast.error("Confirme o pagamento antes de avançar as etapas.");
      return;
    }
    setBusy(stage);
    try {
      await setOrderFulfillment(order!.id, stage);
      toast.success(`Etapa atualizada: ${FULFILLMENT_LABEL[stage]}`);
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível atualizar. Verifique se rodou o SQL de rastreio.");
    } finally {
      setBusy(null);
    }
  }

  const currentIdx = order.fulfillment_status
    ? FULFILLMENT_FLOW.indexOf(order.fulfillment_status)
    : -1;

  return (
    <AdminShell active="pedidos">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <Link to="/pedidos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Pedidos
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl">Rastreio · {order.order_number}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cliente: <span className="text-foreground">{order.customer.name}</span> · {order.customer.email}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Stepper */}
        <div className="mt-8 border border-border rounded-xl bg-background p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Etapas de entrega
          </p>
          <FulfillmentStepper current={order.fulfillment_status} paid={paid} />

          {!paid && (
            <p className="mt-6 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
              Aguardando confirmação de pagamento. As etapas de envio serão liberadas assim que o Mercado Pago confirmar.
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {FULFILLMENT_FLOW.map((stage, i) => {
              const isDone = currentIdx >= i;
              const isNext = currentIdx + 1 === i;
              return (
                <button
                  key={stage}
                  onClick={() => apply(stage)}
                  disabled={!paid || busy !== null || order.fulfillment_status === stage}
                  className={`h-10 rounded-md text-xs font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDone
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : isNext
                        ? "border-primary text-primary hover:bg-primary/10"
                        : "border-border hover:bg-muted"
                  }`}
                >
                  {busy === stage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin inline" />
                  ) : (
                    <>Marcar {FULFILLMENT_LABEL[stage]}</>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Histórico */}
        <div className="mt-6 border border-border rounded-xl bg-background p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Histórico de etapas
          </p>
          {order.fulfillment_history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma etapa registrada ainda.</p>
          ) : (
            <ol className="space-y-3">
              {[...order.fulfillment_history].reverse().map((h, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{FULFILLMENT_LABEL[h.stage]}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Itens */}
        <div className="mt-6 border border-border rounded-xl bg-background p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Itens
          </p>
          <div className="divide-y divide-border text-sm">
            {order.items.map((i) => (
              <div key={i.id} className="py-2 flex justify-between">
                <span>
                  {i.quantity}× {i.product_name}
                  {(i.variant_size || i.variant_color) && (
                    <span className="text-muted-foreground"> · {[i.variant_size, i.variant_color].filter(Boolean).join(" / ")}</span>
                  )}
                </span>
                <span>{formatPrice(i.subtotal, "BRL")}</span>
              </div>
            ))}
            <div className="pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total, "BRL")}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  type Meta = { Icon: typeof CheckCircle2; cls: string; label: string };
  const map: Record<string, Meta> = {
    pago: { Icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", label: "Pago" },
    aguardando_pagamento: { Icon: Clock, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", label: "Aguardando pagamento" },
    cancelado: { Icon: XCircle, cls: "bg-red-500/10 text-red-600 border-red-500/30", label: "Cancelado" },
    estornado: { Icon: XCircle, cls: "bg-red-500/10 text-red-600 border-red-500/30", label: "Estornado" },
  };
  const m = map[status] ?? map.aguardando_pagamento;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.cls}`}>
      <m.Icon className="h-3.5 w-3.5" /> {m.label}
    </span>
  );
}
