import { AdminShell } from "@/components/AdminShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Eye, Printer, XCircle, RefreshCw, X, SlidersHorizontal } from "lucide-react";
import {
  useOrdersStore, ORDER_STATUS_LABEL, statusTone,
  type OrderStatus, type PaymentMethod, type PaymentStatus,
} from "@/stores/ordersStore";
import { fmtBRL, fmtDate } from "@/lib/utils/formatters";

export const Route = createFileRoute("/pedidos/")({
  head: () => ({
    meta: [
      { title: "Pedidos — Soraia Fernandes" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OrdersListPage,
});

const STATUS_OPTIONS: ("todos" | OrderStatus)[] = [
  "todos", "novo", "pago", "separando", "enviado", "entregue", "cancelado",
];
const METHOD_OPTIONS: ("todos" | PaymentMethod)[] = [
  "todos", "pix", "cartao", "boleto", "whatsapp", "manual",
];
const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX", cartao: "Cartão", boleto: "Boleto", whatsapp: "WhatsApp", manual: "Manual",
};
const PAYSTATUS_OPTIONS: ("todos" | PaymentStatus)[] = [
  "todos", "pendente", "pago", "estornado", "falhou",
];
const PAYSTATUS_LABEL: Record<PaymentStatus, string> = {
  pendente: "Pendente", pago: "Pago", estornado: "Estornado", falhou: "Falhou",
};
type SortKey = "recent" | "old" | "high" | "low";
const SORT_LABEL: Record<SortKey, string> = {
  recent: "Mais recentes", old: "Mais antigos", high: "Maior valor", low: "Menor valor",
};

function toISODate(d: Date) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

function OrdersListPage() {
  const orders = useOrdersStore((s) => s.orders);
  const cancel = useOrdersStore((s) => s.cancel);
  const hydrate = useOrdersStore((s) => s.hydrate);
  const subscribeRealtime = useOrdersStore((s) => s.subscribeRealtime);
  const hydrated = useOrdersStore((s) => s.hydrated);

  // Hidrata do Supabase no mount e assina realtime pra refletir
  // webhooks do MP automaticamente (status: pago, cancelado, etc.).
  useEffect(() => {
    void hydrate();
    const unsub = subscribeRealtime();
    return () => { unsub(); };
  }, [hydrate, subscribeRealtime]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | OrderStatus>("todos");
  const [method, setMethod] = useState<"todos" | PaymentMethod>("todos");
  const [payStatus, setPayStatus] = useState<"todos" | PaymentStatus>("todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const clearAll = () => {
    setQ(""); setStatus("todos"); setMethod("todos"); setPayStatus("todos");
    setFrom(""); setTo(""); setMinTotal(""); setMaxTotal(""); setSort("recent");
  };

  const applyPreset = (preset: "hoje" | "7d" | "30d" | "mes") => {
    const today = new Date();
    let start = new Date(today);
    if (preset === "hoje") start = today;
    else if (preset === "7d") start.setDate(today.getDate() - 6);
    else if (preset === "30d") start.setDate(today.getDate() - 29);
    else if (preset === "mes") start = new Date(today.getFullYear(), today.getMonth(), 1);
    setFrom(toISODate(start));
    setTo(toISODate(today));
  };

  const activeFilters =
    (q ? 1 : 0) + (status !== "todos" ? 1 : 0) + (method !== "todos" ? 1 : 0) +
    (payStatus !== "todos" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0) +
    (minTotal ? 1 : 0) + (maxTotal ? 1 : 0);

  const filtered = useMemo(() => {
    const min = minTotal ? parseFloat(minTotal.replace(",", ".")) : null;
    const max = maxTotal ? parseFloat(maxTotal.replace(",", ".")) : null;
    return orders
      .filter((o) => {
        if (status !== "todos" && o.status !== status) return false;
        if (method !== "todos" && o.payment_method !== method) return false;
        if (payStatus !== "todos" && o.payment_status !== payStatus) return false;
        if (q) {
          const s = q.toLowerCase().trim();
          if (!o.number.toLowerCase().includes(s) &&
              !o.customer.name.toLowerCase().includes(s) &&
              !o.customer.email.toLowerCase().includes(s)) return false;
        }
        if (from && new Date(o.created_at) < new Date(from)) return false;
        if (to && new Date(o.created_at) > new Date(to + "T23:59:59")) return false;
        if (min != null && !Number.isNaN(min) && o.total < min) return false;
        if (max != null && !Number.isNaN(max) && o.total > max) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "recent") return +new Date(b.created_at) - +new Date(a.created_at);
        if (sort === "old") return +new Date(a.created_at) - +new Date(b.created_at);
        if (sort === "high") return b.total - a.total;
        return a.total - b.total;
      });
  }, [orders, q, status, method, payStatus, from, to, minTotal, maxTotal, sort]);

  const kpis = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === todayStr);
    return {
      total: orders.length,
      hoje: todayOrders.length,
      aguardando: orders.filter((o) => o.status === "pago" || o.status === "separando").length,
      faturamento: todayOrders.filter((o) => o.status !== "cancelado").reduce((a, o) => a + o.total, 0),
    };
  }, [orders]);

  const filteredTotal = useMemo(() => filtered.reduce((a, o) => a + o.total, 0), [filtered]);


  return (
    <AdminShell active="pedidos">
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Operação</p>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-1">Pedidos</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestão completa de vendas da loja</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-2.5 py-1"
              title="Atualiza automaticamente quando o Mercado Pago confirma o pagamento"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Sincronizado ao vivo
            </span>
            <button
              onClick={() => void hydrate()}
              className="inline-flex items-center gap-1.5 text-xs border border-border rounded-md px-2.5 py-1.5 hover:bg-muted"
              aria-label="Atualizar lista de pedidos"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${!hydrated ? "animate-spin" : ""}`} /> Atualizar
            </button>
            <Link to="/dashboard" className="text-xs font-medium text-primary hover:underline">← Dashboard</Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Total" value={String(kpis.total)} />
          <Kpi label="Pedidos Hoje" value={String(kpis.hoje)} />
          <Kpi label="Aguardando envio" value={String(kpis.aguardando)} />
          <Kpi label="Faturamento Hoje" value={fmtBRL(kpis.faturamento)} />
        </div>

        {/* Filtros */}
        <div className="rounded-xl border border-border bg-background p-4 mb-6 space-y-3">
          {/* Linha 1: busca + status + sort + toggle avançado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Número do pedido, cliente ou e-mail…"
                className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
              />
            </div>
            <select
              value={status} onChange={(e) => setStatus(e.target.value as never)}
              aria-label="Status do pedido"
              className="h-10 w-full rounded-md border border-border bg-background text-sm px-3 lg:col-span-3"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "todos" ? "Todos status" : ORDER_STATUS_LABEL[s as OrderStatus]}
                </option>
              ))}
            </select>
            <select
              value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Ordenar"
              className="h-10 w-full rounded-md border border-border bg-background text-sm px-3 lg:col-span-2"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABEL[k]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="h-10 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background text-xs font-medium hover:bg-muted lg:col-span-2"
              aria-expanded={showAdvanced}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Avançado
              {activeFilters > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 text-primary px-1.5 text-[10px] font-semibold">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {/* Presets rápidos de data */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Período:</span>
            {([
              ["hoje", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"], ["mes", "Este mês"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => applyPreset(k)}
                className="text-xs rounded-full border border-border px-2.5 py-1 hover:bg-muted"
              >
                {label}
              </button>
            ))}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              aria-label="Data inicial"
              className="h-8 rounded-md border border-border bg-background text-xs px-2" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              aria-label="Data final"
              className="h-8 rounded-md border border-border bg-background text-xs px-2" />
          </div>

          {/* Linha avançada */}
          {showAdvanced && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Forma de pagamento</label>
                <select
                  value={method} onChange={(e) => setMethod(e.target.value as never)}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-background text-sm px-3"
                >
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m === "todos" ? "Todas" : METHOD_LABEL[m as PaymentMethod]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Status do pagamento</label>
                <select
                  value={payStatus} onChange={(e) => setPayStatus(e.target.value as never)}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-background text-sm px-3"
                >
                  {PAYSTATUS_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p === "todos" ? "Todos" : PAYSTATUS_LABEL[p as PaymentStatus]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor mínimo (R$)</label>
                <input
                  inputMode="decimal" value={minTotal}
                  onChange={(e) => setMinTotal(e.target.value)}
                  placeholder="0,00"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-background text-sm px-3"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor máximo (R$)</label>
                <input
                  inputMode="decimal" value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  placeholder="0,00"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-background text-sm px-3"
                />
              </div>
            </div>
          )}

          {/* Rodapé filtros: contagem + limpar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span> {filtered.length === 1 ? "pedido" : "pedidos"}
              {" · "}Total filtrado: <span className="font-medium text-foreground">{fmtBRL(filteredTotal)}</span>
            </p>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros ({activeFilters})
              </button>
            )}
          </div>
        </div>


        {/* Tabela desktop */}
        <div className="hidden md:block rounded-xl border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Pedido</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-right px-4 py-3 font-medium">Itens</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Pagamento</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{o.number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{o.customer.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-right">{o.items.reduce((a, i) => a + i.quantity, 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmtBRL(o.total)}</td>
                  <td className="px-4 py-3 capitalize text-xs">{o.payment_method} · <span className="text-muted-foreground">{o.payment_status}</span></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${statusTone[o.status]}`}>
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link to="/pedidos/$id" params={{ id: o.id }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </Link>
                      {o.status !== "cancelado" && o.status !== "entregue" && (
                        <button
                          onClick={() => confirm(`Cancelar pedido ${o.number}?`) && cancel(o.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                          <XCircle className="h-3.5 w-3.5" /> Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">Nenhum pedido encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((o) => (
            <Link key={o.id} to="/pedidos/$id" params={{ id: o.id }}
              className="block rounded-xl border border-border bg-background p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{o.number}</div>
                  <div className="text-xs text-muted-foreground">{o.customer.name}</div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${statusTone[o.status]}`}>
                  {ORDER_STATUS_LABEL[o.status]}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">{fmtDate(o.created_at)}</span>
                <span className="font-semibold">{fmtBRL(o.total)}</span>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">Nenhum pedido encontrado.</p>
          )}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Estrutura preparada para Stripe, Pix, Cartão, WhatsApp e Webhooks. <Printer className="inline h-3 w-3" /> Imprimir disponível no detalhe.
        </p>
      </div>
    </div>
    </AdminShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
