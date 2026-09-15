import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Package, AlertTriangle, DollarSign, TrendingUp, ArrowUpRight } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useOrdersStore, STORE_ID, type Order } from "@/stores/ordersStore";
import { fmtBRL } from "@/lib/utils/formatters";
import { useProductsStore } from "@/stores/productsStore";
import { loadLeads } from "@/lib/leads";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Soraia Fernandes" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Pago: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Novo: "bg-slate-100 text-slate-700 ring-slate-200",
    Separando: "bg-amber-50 text-amber-700 ring-amber-200",
    Enviado: "bg-blue-50 text-blue-700 ring-blue-200",
    Entregue: "bg-violet-50 text-violet-700 ring-violet-200",
    Cancelado: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${map[s] ?? "bg-muted text-foreground ring-border"}`}>
      {s}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-background p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, hint, to }: { title: string; hint?: string; to?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver tudo <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
};

const statusLabel = (s: Order["status"]) =>
  ({ novo: "Novo", pago: "Pago", separando: "Separando", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado" }[s]);

function DashboardPage() {
  const orders = useOrdersStore((s) => s.orders);
  const hydrateOrders = useOrdersStore((s) => s.hydrate);
  const subscribeOrders = useOrdersStore((s) => s.subscribeRealtime);

  const products = useProductsStore((s) => s.products);
  const hydrateProducts = useProductsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateOrders();
    void hydrateProducts();
    const unsub = subscribeOrders();
    return unsub;
  }, [hydrateOrders, hydrateProducts, subscribeOrders]);

  const [leads, setLeads] = useState<any[]>([]);
  useEffect(() => {
    loadLeads()
      .then(setLeads)
      .catch(() => setLeads([]));
  }, []);

  const startOfToday = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }, []);
  const startOfMonth = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime();
  }, []);

  const paidStatuses: Order["status"][] = ["pago", "separando", "enviado", "entregue"];
  const isPaid = (o: Order) => paidStatuses.includes(o.status);
  // Data de referência para faturamento: paid_at (fonte de verdade do webhook)
  // com fallback para created_at quando o admin marcou como pago manualmente.
  const paidAtMs = (o: Order) =>
    new Date(o.paid_at ?? o.created_at).getTime();

  const todayOrders = orders.filter((o) => new Date(o.created_at).getTime() >= startOfToday);
  const todayPaid = orders.filter((o) => isPaid(o) && paidAtMs(o) >= startOfToday);
  const salesToday = todayPaid.reduce((a, o) => a + o.total, 0);

  const monthOrders = orders.filter((o) => new Date(o.created_at).getTime() >= startOfMonth);
  const monthPaid = orders.filter((o) => isPaid(o) && paidAtMs(o) >= startOfMonth);
  const monthRevenue = monthPaid.reduce((a, o) => a + o.total, 0);
  const ticket = monthPaid.length ? monthRevenue / monthPaid.length : 0;
  const pendingToday = todayOrders.filter((o) => !isPaid(o) && o.status !== "cancelado").length;

  const activeProducts = products.filter((p) => p.status === "ativo");
  const lowStockItems = activeProducts
    .filter((p) => p.track_stock !== false && p.stock > 0 && p.stock <= (p.minimum_stock || 5))
    .sort((a, b) => a.stock - b.stock);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 4);

  const kpis = [
    { label: "Vendas Hoje", value: fmtBRL(salesToday), delta: `${todayPaid.length} pagos`, icon: DollarSign, accent: "text-emerald-600" },
    { label: "Pedidos Hoje", value: String(todayOrders.length), delta: `${pendingToday} pendentes`, icon: ShoppingBag, accent: "text-blue-600" },
    { label: "Produtos Ativos", value: String(activeProducts.length), delta: `${products.length} no total`, icon: Package, accent: "text-violet-600" },
    { label: "Estoque Baixo", value: String(lowStockItems.length), delta: lowStockItems.length ? "reposição" : "ok", icon: AlertTriangle, accent: "text-amber-600" },
  ];

  return (
    <AdminShell active="dashboard">
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Painel da loja</p>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-1">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral · Soraia Fernandes</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Dados em tempo real · {new Date().toLocaleTimeString("pt-BR")}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, delta, icon: Icon, accent }) => (
            <Card key={label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                  <p className={`mt-1 text-xs font-medium ${accent}`}>{delta}</p>
                </div>
                <div className={`rounded-lg bg-muted p-2 ${accent}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <SectionHeader title="Pedidos Recentes" hint="Últimas vendas registradas" to="/pedidos" />
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</p>
            ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Pedido</th>
                    <th className="px-2 py-2 font-medium">Cliente</th>
                    <th className="px-2 py-2 font-medium">Total</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium text-right">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-2 py-3 font-medium">{o.number}</td>
                      <td className="px-2 py-3 text-muted-foreground">{o.customer.name || "—"}</td>
                      <td className="px-2 py-3">{fmtBRL(o.total)}</td>
                      <td className="px-2 py-3"><StatusPill s={statusLabel(o.status)} /></td>
                      <td className="px-2 py-3 text-right text-xs text-muted-foreground">{timeAgo(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </Card>

          <Card>
            <SectionHeader title="Resumo Mensal" hint="Mês atual" />
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" /> Faturamento</div>
                <div className="font-semibold">{fmtBRL(monthRevenue)}</div>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShoppingBag className="h-4 w-4" /> Pedidos pagos</div>
                <div className="font-semibold">{monthPaid.length}</div>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="text-sm text-muted-foreground">Ticket Médio</div>
                <div className="font-semibold">{fmtBRL(ticket)}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total no mês</div>
                <div className="font-semibold">{monthOrders.length} pedidos</div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <SectionHeader title="Produtos com Estoque Baixo" hint="Reposição recomendada" to="/produtos" />
            {lowStockItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item com estoque baixo. 🎉</p>
            ) : (
            <ul className="divide-y divide-border">
              {lowStockItems.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">SKU {p.sku || "—"}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5" /> {p.stock} un.
                  </span>
                </li>
              ))}
            </ul>
            )}
          </Card>

          <Card>
            <SectionHeader title="Leads Recentes" hint="Capturas dos últimos dias" />
            {recentLeads.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lead capturado ainda.</p>
            ) : (
            <ul className="divide-y divide-border">
              {recentLeads.map((l, i) => (
                <li key={i} className="flex items-start justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{l.name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{l.email || l.whatsapp || l.value || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80 ring-1 ring-border">
                      <Package className="h-3 w-3" /> {l.source ?? l.type ?? "—"}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(l.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
    </AdminShell>
  );
}
