import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Megaphone, Mail, Ticket, Package, Plus, Trash2, Calendar, Hash, Percent, ShoppingCart, MessageCircle, ExternalLink, CheckCircle2 } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { loadLeads, type Lead } from "@/lib/leads";
import { loadCoupons, saveCoupon, deleteCoupon, type Coupon } from "@/lib/coupons";
import { loadAbandonedCarts, markAsRecovered, buildAbandonmentWhatsAppLink, type AbandonedCart } from "@/lib/api/abandoned";
import { toast } from "sonner";
import { formatPrice } from "@/lib/shopify";

export const Route = createFileRoute("/marketing/")({
  head: () => ({ meta: [{ title: "Marketing — Soraia Fernandes" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: MarketingPage,
});

type Tab = "leads" | "cupons" | "newsletter" | "abandoned";

function MarketingPage() {
  const [tab, setTab] = useState<Tab>("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [abandoned, setAbandoned] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(false);

  const [newCoupon, setNewCoupon] = useState<Omit<Coupon, "id" | "created_at" | "usage_count">>({
    code: "",
    type: "percentage",
    value: 0,
    expires_at: null,
    usage_limit: null,
    is_active: true,
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const [l, c, a] = await Promise.all([loadLeads(), loadCoupons(), loadAbandonedCarts()]);
      setLeads(l);
      setCoupons(c);
      setAbandoned(a);
    } catch (e) {
      toast.error("Não foi possível carregar leads/cupons do banco.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || newCoupon.value <= 0) {
      toast.error("Preencha o código e o valor.");
      return;
    }
    try {
      await saveCoupon(newCoupon);
      toast.success("Cupom criado!");
      setNewCoupon({
        code: "",
        type: "percentage",
        value: 0,
        expires_at: null,
        usage_limit: null,
        is_active: true,
      });
      refresh();
    } catch (e) {
      toast.error("Erro ao criar cupom.");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Tem certeza?")) return;
    try {
      await deleteCoupon(id);
      toast.success("Cupom removido.");
      refresh();
    } catch (e) {
      toast.error("Erro ao remover cupom.");
    }
  };

  const newsletterLeads = leads.filter((l) => (l.source ?? l.type) !== "whatsapp");

  return (
    <AdminShell active="marketing">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-primary" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Crescimento</p>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight">Marketing</h1>
          </div>
        </div>

        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {[
            { k: "leads" as Tab, label: "Leads", icon: Package },
            { k: "cupons" as Tab, label: "Cupons", icon: Ticket },
            { k: "abandoned" as Tab, label: "Carrinhos", icon: ShoppingCart },
            { k: "newsletter" as Tab, label: "Newsletter", icon: Mail },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "leads" && (
          <div className="rounded-xl border border-border bg-background">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Leads capturados ({leads.length})</h2>
            </div>
            <ul className="divide-y divide-border">
              {leads.length === 0 && <li className="p-6 text-sm text-muted-foreground">Nenhum lead ainda.</li>}
              {leads.map((l, i) => {
                const contato = l.email || l.whatsapp || l.value || "";
                const origem = l.source ?? l.type ?? "newsletter";
                return (
                  <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="uppercase text-[10px] tracking-widest text-muted-foreground w-24">{origem}</span>
                    <span className="flex-1 truncate">{l.name ? `${l.name} · ` : ""}{contato}</span>
                    <span className="text-xs text-muted-foreground">{l.at ? new Date(l.at).toLocaleDateString("pt-BR") : "—"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "cupons" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-background p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" /> Novo Cupom
              </h2>
              <form onSubmit={handleCreateCoupon} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Código</label>
                  <input
                    type="text"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon(s => ({ ...s, code: e.target.value.toUpperCase() }))}
                    placeholder="EX: PROMO10"
                    className="w-full h-10 px-3 rounded-md border border-border bg-background focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
                  <select
                    value={newCoupon.type}
                    onChange={(e) => setNewCoupon(s => ({ ...s, type: e.target.value as any }))}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</label>
                  <input
                    type="number"
                    value={newCoupon.value || ""}
                    onChange={(e) => setNewCoupon(s => ({ ...s, value: parseFloat(e.target.value) || 0 }))}
                    placeholder="10"
                    className="w-full h-10 px-3 rounded-md border border-border bg-background focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Limite de uso (opcional)</label>
                  <input
                    type="number"
                    value={newCoupon.usage_limit || ""}
                    onChange={(e) => setNewCoupon(s => ({ ...s, usage_limit: parseInt(e.target.value) || null }))}
                    placeholder="100"
                    className="w-full h-10 px-3 rounded-md border border-border bg-background focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Validade (opcional)</label>
                  <input
                    type="date"
                    value={newCoupon.expires_at || ""}
                    onChange={(e) => setNewCoupon(s => ({ ...s, expires_at: e.target.value || null }))}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full h-10 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition"
                  >
                    Criar Cupom
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-semibold">Cupons ativos ({coupons.length})</h2>
              </div>
              <ul className="divide-y divide-border">
                {coupons.length === 0 && (
                  <li className="p-10 text-center text-sm text-muted-foreground">
                    <Ticket className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    Nenhum cupom criado ainda.
                  </li>
                )}
                {coupons.map((c) => (
                  <li key={c.id} className="p-5 flex items-center justify-between group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-secondary px-2 py-0.5 rounded text-sm tracking-tight">{c.code}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${c.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                          {c.is_active ? "Ativo" : "Pausado"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {c.type === "percentage" ? <Percent className="h-3 w-3" /> : "R$"} {c.value}{c.type === "percentage" ? "%" : ""} de desconto
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" /> {c.usage_count} / {c.usage_limit || "∞"} usos
                        </span>
                        {c.expires_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Vence em {new Date(c.expires_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCoupon(c.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "newsletter" && (
          <div className="rounded-xl border border-border bg-background p-6">
            <h2 className="font-semibold mb-2">Inscritos na newsletter</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Total: {newsletterLeads.length} contatos
            </p>
            <ul className="divide-y divide-border max-h-96 overflow-auto">
              {newsletterLeads.map((l, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span className="truncate">{l.email || l.value}</span>
                  <span className="text-xs text-muted-foreground">{l.at ? new Date(l.at).toLocaleDateString("pt-BR") : "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "abandoned" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Carrinhos Abandonados ({abandoned.length})</h2>
                <span className="text-xs text-muted-foreground">Últimas 24h</span>
              </div>
              <ul className="divide-y divide-border">
                {abandoned.length === 0 && (
                  <li className="p-10 text-center text-sm text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    Nenhum carrinho abandonado recentemente.
                  </li>
                )}
                {abandoned.map((a) => (
                  <li key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{a.customer_name || "Cliente sem nome"}</span>
                        {a.customer_phone && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold uppercase">
                            WhatsApp
                          </span>
                        )}
                        {a.customer_email && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold uppercase">
                            E-mail
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.customer_email} {a.customer_phone && `· ${a.customer_phone}`}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-2">
                        {a.cart_data.items?.length || 0} itens · Total: {formatPrice(a.total)}
                      </div>
                      <div className="text-[10px] text-muted-foreground italic">
                        Visto pela última vez: {new Date(a.last_updated_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const link = buildAbandonmentWhatsAppLink(a);
                          window.open(link, "_blank");
                          try {
                            await markAsRecovered(a.id);
                            refresh();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        disabled={!a.customer_phone}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageCircle className="h-4 w-4" /> Recuperar WhatsApp
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Marcar este carrinho como recuperado manualmente?")) return;
                          try {
                            await markAsRecovered(a.id);
                            toast.success("Marcado como recuperado!");
                            refresh();
                          } catch (e) {
                            toast.error("Erro ao atualizar status.");
                          }
                        }}
                        className="p-2 text-muted-foreground hover:text-primary transition"
                        title="Marcar como recuperado"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <Megaphone className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">Dica de Recuperação</p>
                <p className="mt-1 opacity-90">
                  Carrinhos com mais de 30 minutos de inatividade são os melhores para recuperar. 
                  Ao clicar no botão de WhatsApp, a mensagem já vai pronta com o link do checkout e a lista de itens.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
