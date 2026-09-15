import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Printer, CheckCircle2, XCircle, Mail, MapPin, User, Package,
  Clock, Send, Truck, MessageCircle, Store, Copy, ExternalLink,
} from "lucide-react";
import {
  useOrdersStore, ORDER_STATUS_LABEL, ORDER_STATUS_FLOW, statusTone,
  type OrderStatus,
} from "@/stores/ordersStore";
import { fmtBRL, fmtDate } from "@/lib/utils/formatters";
import {
  FULFILLMENT_FLOW, FULFILLMENT_LABEL, FULFILLMENT_DESCRIPTION, setOrderFulfillment,
  getOrderPublic, type FulfillmentStage,
} from "@/lib/api/orderTracking";
import { buildCustomerWhatsAppLink, buildOrderPaidMessage, buildStageMessage } from "@/lib/shopify";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do Pedido — Soraia Fernandes" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = useParams({ from: "/pedidos/$id" });
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === id));
  const hydrate = useOrdersStore((s) => s.hydrate);
  const setStatus = useOrdersStore((s) => s.setStatus);
  const cancel = useOrdersStore((s) => s.cancel);

  const [fulfillment, setFulfillment] = useState<FulfillmentStage | null>(null);
  const [savingStage, setSavingStage] = useState<FulfillmentStage | null>(null);

  // Carrega fulfillment atual do banco (o store local não guarda essa coluna).
  useEffect(() => {
    if (!order?.customer?.email) return;
    let cancelled = false;
    getOrderPublic(order.number, order.customer.email)
      .then((o) => { if (!cancelled) setFulfillment(o?.fulfillment_status ?? null); })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [order?.number, order?.customer?.email]);

  const paid = order?.payment_status === "pago";

  const trackingUrl = order
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/pedido/${order.number}${
        order?.customer?.email ? `?email=${encodeURIComponent(order.customer.email)}` : ""
      }`
    : "";

  const notifyStageWhatsApp = (stage: FulfillmentStage) => {
    if (!order?.customer?.phone) return;
    const msg = buildStageMessage({
      customerName: order.customer.name,
      orderNumber: order.number,
      stageLabel: FULFILLMENT_LABEL[stage],
      stageDescription: FULFILLMENT_DESCRIPTION[stage],
      trackingUrl,
    });
    window.open(buildCustomerWhatsAppLink(order.customer.phone, msg), "_blank", "noopener");
  };

  const advanceFulfillment = async (stage: FulfillmentStage, opts?: { notify?: boolean }) => {
    if (!order) return;
    if (!paid) {
      toast.error("Confirme o pagamento antes de avançar as etapas de envio.");
      return;
    }
    setSavingStage(stage);
    try {
      await setOrderFulfillment(order.id, stage);
      setFulfillment(stage);
      toast.success(`Etapa atualizada: ${FULFILLMENT_LABEL[stage]}`);
      void hydrate();
      if (opts?.notify) notifyStageWhatsApp(stage);
    } catch (e) {
      toast.error("Falha ao atualizar etapa", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingStage(null);
    }
  };

  const pickupUrl = order
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/pedido/retirada/${order.number}${
        order.customer?.email ? `?email=${encodeURIComponent(order.customer.email)}` : ""
      }`
    : "";

  const confirmPickup = async () => {
    if (!order) return;
    if (!paid) {
      toast.error("Confirme o pagamento antes de registrar a retirada.");
      return;
    }
    if (!confirm(`Confirmar retirada na loja do pedido ${order.number}?`)) return;
    setSavingStage("entregue");
    try {
      await setOrderFulfillment(order.id, "entregue");
      setFulfillment("entregue");
      setStatus(order.id, "entregue");
      toast.success("Retirada registrada como Entregue.");
      void hydrate();
    } catch (e) {
      toast.error("Falha ao registrar retirada", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingStage(null);
    }
  };

  const sendPickupWhatsapp = () => {
    if (!order?.customer.phone) return;
    const msg = `Olá ${order.customer.name}! Seu pedido *${order.number}* está pronto para retirada na loja Soraia Fernandes. Instruções e endereço: ${pickupUrl}`;
    window.open(buildCustomerWhatsAppLink(order.customer.phone, msg), "_blank", "noopener");
  };

  const copyPickupLink = async () => {
    try {
      await navigator.clipboard.writeText(pickupUrl);
      toast.success("Link de retirada copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };



  const nextStatus = useMemo<OrderStatus | null>(() => {
    if (!order || order.status === "cancelado" || order.status === "entregue") return null;
    const idx = ORDER_STATUS_FLOW.indexOf(order.status);
    return idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[idx + 1] : null;
  }, [order]);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Pedido não encontrado.</p>
          <Link to="/pedidos" className="text-primary hover:underline text-sm mt-2 inline-block">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <Link to="/pedidos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Pedidos
            </Link>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-1">Pedido {order.number}</h1>
            <p className="text-sm text-muted-foreground mt-1">Criado em {fmtDate(order.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {paid && order.customer.phone && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/pedido/sucesso/${order.number}${
                    order.customer.email ? `?email=${encodeURIComponent(order.customer.email)}` : ""
                  }`;
                  const msg = buildOrderPaidMessage({
                    customerName: order.customer.name,
                    orderNumber: order.number,
                    total: order.total,
                    trackingUrl: url,
                  });
                  window.open(buildCustomerWhatsAppLink(order.customer.phone, msg), "_blank", "noopener");
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[#25D366] text-white text-sm font-medium hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> Notificar cliente (WhatsApp)
              </button>
            )}
            {nextStatus && (
              <button
                onClick={() => setStatus(order.id, nextStatus)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-foreground/85">
                <CheckCircle2 className="h-4 w-4" /> Avançar para {ORDER_STATUS_LABEL[nextStatus]}
              </button>
            )}
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background text-sm hover:bg-muted">
              <Printer className="h-4 w-4" /> Imprimir pedido
            </button>
            <button
              onClick={() => alert("Confirmação reenviada para " + order.customer.email)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background text-sm hover:bg-muted">
              <Send className="h-4 w-4" /> Reenviar
            </button>
            {order.status !== "cancelado" && order.status !== "entregue" && (
              <button
                onClick={() => confirm("Cancelar este pedido?") && cancel(order.id)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background text-sm text-rose-600 hover:bg-rose-50">
                <XCircle className="h-4 w-4" /> Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusTone[order.status]}`}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <span className="text-xs text-muted-foreground">
            Pagamento: <strong className="capitalize">{order.payment_status}</strong> · {order.payment_method.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Produtos" icon={<Package className="h-4 w-4" />}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium">Produto</th>
                      <th className="text-right py-2 font-medium">Qtd</th>
                      <th className="text-right py-2 font-medium">Preço</th>
                      <th className="text-right py-2 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it) => (
                      <tr key={it.id} className="border-b border-border last:border-0">
                        <td className="py-3">
                          <div className="font-medium">{it.name}</div>
                          <div className="text-xs text-muted-foreground">
                            SKU {it.sku}{it.size ? ` · ${it.size}` : ""}{it.color ? ` · ${it.color}` : ""}
                          </div>
                        </td>
                        <td className="py-3 text-right">{it.quantity}</td>
                        <td className="py-3 text-right">{fmtBRL(it.price)}</td>
                        <td className="py-3 text-right font-medium">{fmtBRL(it.price * it.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
                <Row label="Subtotal" value={fmtBRL(order.subtotal)} />
                <Row label="Frete" value={fmtBRL(order.shipping)} />
                {order.discount > 0 && <Row label="Desconto" value={"− " + fmtBRL(order.discount)} />}
                <div className="flex justify-between pt-2 border-t border-border font-semibold text-base">
                  <span>Total</span><span>{fmtBRL(order.total)}</span>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card title="Histórico / Timeline" icon={<Clock className="h-4 w-4" />}>
              <ol className="relative border-l border-border ml-2 space-y-4">
                {order.history.map((h) => (
                  <li key={h.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-primary" />
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${statusTone[h.new_status]}`}>
                        {ORDER_STATUS_LABEL[h.new_status]}
                      </span>
                      {h.old_status && (
                        <span className="text-xs text-muted-foreground">
                          (de {ORDER_STATUS_LABEL[h.old_status]})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmtDate(h.created_at)} · por {h.user_id}
                    </p>
                    {h.note && <p className="text-xs mt-1">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Cliente" icon={<User className="h-4 w-4" />}>
              <div className="text-sm space-y-1">
                <p className="font-medium">{order.customer.name}</p>
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {order.customer.email}
                </p>
                <p className="text-muted-foreground">{order.customer.phone}</p>
              </div>
            </Card>

            <Card title="Endereço de Entrega" icon={<MapPin className="h-4 w-4" />}>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>{order.address.street}, {order.address.number}</p>
                {order.address.complement && <p>{order.address.complement}</p>}
                <p>{order.address.district}</p>
                <p>{order.address.city} — {order.address.state}</p>
                <p>CEP {order.address.zip}</p>
              </div>
            </Card>

            <Card title="Etapas de envio (cliente vê)" icon={<Truck className="h-4 w-4" />}>
              {!paid && (
                <p className="text-xs text-amber-600 mb-3">
                  Confirme o pagamento para liberar as etapas.
                </p>
              )}
              <div className="space-y-2">
                {FULFILLMENT_FLOW.map((s, i) => {
                  const currentIdx = fulfillment ? FULFILLMENT_FLOW.indexOf(fulfillment) : -1;
                  const done = currentIdx >= i;
                  const isCurrent = currentIdx === i;
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      <button
                        disabled={!paid || savingStage !== null || isCurrent}
                        onClick={() => advanceFulfillment(s)}
                        className={`flex-1 flex items-center justify-between h-9 px-3 rounded-md border text-xs transition
                          ${done ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}
                          ${isCurrent ? "ring-2 ring-primary/30" : ""}
                          hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <span className="font-medium">{i + 1}. {FULFILLMENT_LABEL[s]}</span>
                        {savingStage === s ? (
                          <span className="text-[10px]">salvando…</span>
                        ) : done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        ) : null}
                      </button>
                      {paid && order.customer.phone && (
                        <button
                          title="Marcar e avisar cliente no WhatsApp"
                          disabled={savingStage !== null || isCurrent}
                          onClick={() => advanceFulfillment(s, { notify: true })}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-[#25D366] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {paid && order.customer.phone && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Clique no ícone verde para atualizar a etapa <strong>e</strong> abrir o WhatsApp já com a mensagem pronta.
                </p>
              )}
            </Card>

            {/* Atalhos 1-clique para etapas de retirada/entrega */}
            {paid && (
              <Card title="Avisos rápidos" icon={<MessageCircle className="h-4 w-4" />}>
                <p className="text-xs text-muted-foreground mb-3">
                  Atualiza a etapa e abre o WhatsApp do cliente com a mensagem pronta.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => advanceFulfillment("pronto_retirada", { notify: true })}
                    disabled={savingStage !== null || !order.customer.phone}
                    className="w-full inline-flex items-center justify-between h-10 px-3 rounded-md bg-primary/10 text-primary border border-primary/30 text-xs font-medium hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5" /> Pronto p/ retirada
                    </span>
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => advanceFulfillment("em_transito", { notify: true })}
                    disabled={savingStage !== null || !order.customer.phone}
                    className="w-full inline-flex items-center justify-between h-10 px-3 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" /> Em trânsito
                    </span>
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => advanceFulfillment("entregue", { notify: true })}
                    disabled={savingStage !== null || !order.customer.phone}
                    className="w-full inline-flex items-center justify-between h-10 px-3 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Entregue
                    </span>
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
                {!order.customer.phone && (
                  <p className="mt-2 text-[11px] text-amber-600">Cliente sem telefone — não é possível avisar no WhatsApp.</p>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground break-all">
                  Link público: {trackingUrl || "—"}
                </p>
              </Card>
            )}

            <Card title="Retirada na loja" icon={<Store className="h-4 w-4" />}>
              <p className="text-xs text-muted-foreground mb-3">
                Se o cliente vai buscar o pedido na loja, use os atalhos abaixo.
              </p>
              <button
                onClick={confirmPickup}
                disabled={!paid || savingStage !== null || fulfillment === "entregue"}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-foreground/85 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {fulfillment === "entregue" ? "Retirada concluída" : "Confirmar retirada (marca como Entregue)"}
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a
                  href={pickupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-border text-xs hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir instruções
                </a>
                <button
                  onClick={copyPickupLink}
                  className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-border text-xs hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
              </div>
              {order.customer.phone && (
                <button
                  onClick={sendPickupWhatsapp}
                  disabled={!paid}
                  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-[#25D366] text-white text-xs font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Avisar cliente no WhatsApp
                </button>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground break-all">
                {pickupUrl || "—"}
              </p>
            </Card>


            <Card title="Status interno (admin)">
              <div className="grid grid-cols-2 gap-2">
                {ORDER_STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    disabled={s === order.status}
                    onClick={() => setStatus(order.id, s)}
                    className="h-9 rounded-md border border-border text-xs hover:bg-muted disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed">
                    {ORDER_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </Card>

            <button onClick={() => window.print()}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-background text-sm hover:bg-muted print:hidden">
              <Printer className="h-4 w-4" /> Imprimir separação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span><span className="text-foreground">{value}</span>
    </div>
  );
}
