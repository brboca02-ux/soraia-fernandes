import { AdminShell } from "@/components/AdminShell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Copy, Archive, Plus, Search, ImageOff, Sparkles, Trash2, Star, ArchiveRestore } from "lucide-react";
import { useProductsStore, CATEGORIES, effectiveStock, type ProductStatus } from "@/stores/productsStore";

export const Route = createFileRoute("/produtos/")({
  head: () => ({ meta: [{ title: "Produtos — Soraia Fernandes" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ProductsListPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge: Record<ProductStatus, string> = {
  ativo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inativo: "bg-muted text-muted-foreground ring-border",
  arquivado: "bg-amber-50 text-amber-700 ring-amber-200",
};

function ProductsListPage() {
  const navigate = useNavigate();
  const products = useProductsStore((s) => s.products);
  const duplicate = useProductsStore((s) => s.duplicate);
  const archive = useProductsStore((s) => s.archive);
  const update = useProductsStore((s) => s.update);
  const remove = useProductsStore((s) => s.remove);
  const toggleShowcase = useProductsStore((s) => s.toggleShowcase);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const rows = useMemo(() => {
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.category_id !== cat) return false;
      if (status && p.status !== status) return false;
      return true;
    });
  }, [products, q, cat, status]);

  return (
    <AdminShell active="produtos" tabs={[{ label: "Produtos", to: "/produtos" }, { label: "Categorias", to: "/categorias" }]}>
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Catálogo</p>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-1">Produtos</h1>
            <p className="text-sm text-muted-foreground mt-1">{rows.length} de {products.length} produtos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/produtos/rapido"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" /> Cadastro rápido com IA
            </Link>
            <Link
              to="/produtos/novo"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/85"
            >
              <Plus className="h-4 w-4" /> Novo Produto
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 rounded-xl border border-border bg-background p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome…"
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Produto</th>
                <th className="text-left font-medium px-4 py-3">Categoria</th>
                <th className="text-left font-medium px-4 py-3">Preço</th>
                <th className="text-left font-medium px-4 py-3">Estoque</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Vitrine</th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Nenhum produto encontrado.</td></tr>
              )}
              {rows.map((p) => {
                const img = p.images.find((i) => i.is_primary) ?? p.images[0];
                const cat = CATEGORIES.find((c) => c.id === p.category_id)?.name ?? p.category_id;
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-muted">
                          {img ? <img src={img.url} alt="" className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-muted-foreground"><ImageOff className="h-4 w-4" /></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">SKU {p.sku || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{cat}</td>
                    <td className="px-4 py-3">
                      {p.sale_price ? (
                        <div>
                          <span className="font-medium">{BRL(p.sale_price)}</span>
                          <span className="ml-2 text-xs line-through text-muted-foreground">{BRL(p.price)}</span>
                        </div>
                      ) : <span className="font-medium">{BRL(p.price)}</span>}
                    </td>
                    <td className="px-4 py-3">{effectiveStock(p)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 capitalize ${statusBadge[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => { toggleShowcase(p.id); toast.success(p.showcase ? "Removido da vitrine" : "Adicionado à vitrine"); }}
                        className={`p-1.5 rounded-full transition-colors ${p.showcase ? "bg-gold/10 text-gold" : "text-muted-foreground hover:bg-muted"}`}
                        title={p.showcase ? "Remover da vitrine" : "Adicionar à vitrine"}
                      >
                        <Star className={`h-4 w-4 ${p.showcase ? "fill-current" : ""}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => navigate({ to: "/produtos/$id/editar", params: { id: p.id } })}
                          className="rounded p-1.5 hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => { duplicate(p.id); toast.success("Produto duplicado"); }}
                          className="rounded p-1.5 hover:bg-muted" title="Duplicar"><Copy className="h-4 w-4" /></button>
                        {p.status === "arquivado" ? (
                          <button
                            onClick={() => {
                              update(p.id, { status: "ativo" })
                                .then(() => toast.success("Produto reativado"))
                                .catch((e: any) => toast.error(e?.message ?? "Erro ao reativar"));
                            }}
                            className="rounded p-1.5 hover:bg-muted text-emerald-700"
                            title="Reativar produto"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              archive(p.id)
                                .then(() => toast.success("Produto arquivado (não foi apagado)"))
                                .catch((e: any) => toast.error(e?.message ?? "Erro ao arquivar"));
                            }}
                            className="rounded p-1.5 hover:bg-muted text-amber-700"
                            title="Arquivar (esconde da loja, sem apagar)"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => { if (confirm(`Apagar definitivamente "${p.name}"? Esta ação não pode ser desfeita.`)) { remove(p.id).then(() => toast.success("Produto apagado")).catch((e) => toast.error(e?.message ?? "Erro ao apagar")); } }}
                          className="rounded p-1.5 hover:bg-muted text-red-700" title="Apagar"><Trash2 className="h-4 w-4" /></button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map((p) => {
            const img = p.images.find((i) => i.is_primary) ?? p.images[0];
            const cat = CATEGORIES.find((c) => c.id === p.category_id)?.name ?? p.category_id;
            return (
              <div key={p.id} className="rounded-xl border border-border bg-background p-3 flex gap-3">
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded bg-muted">
                  {img ? <img src={img.url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium truncate">{p.name}</p>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 capitalize ${statusBadge[p.status]}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{cat} · SKU {p.sku || "—"}</p>
                  <p className="text-sm font-medium mt-1">{BRL(p.sale_price ?? p.price)} · estoque {effectiveStock(p)}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button 
                      onClick={() => { toggleShowcase(p.id); toast.success(p.showcase ? "Removido da vitrine" : "Na vitrine"); }}
                      className={`text-xs rounded border px-2 py-1 flex items-center gap-1 ${p.showcase ? "border-gold bg-gold/5 text-gold" : "border-border text-muted-foreground"}`}
                    >
                      <Star className={`h-3 w-3 ${p.showcase ? "fill-current" : ""}`} />
                      Vitrine
                    </button>
                    <button onClick={() => navigate({ to: "/produtos/$id/editar", params: { id: p.id } })}
                      className="text-xs rounded border border-border px-2 py-1">Editar</button>
                    <button onClick={() => { duplicate(p.id); toast.success("Duplicado"); }}
                      className="text-xs rounded border border-border px-2 py-1">Duplicar</button>
                    {p.status === "arquivado" ? (
                      <button
                        onClick={() => {
                          update(p.id, { status: "ativo" })
                            .then(() => toast.success("Reativado"))
                            .catch((e: any) => toast.error(e?.message ?? "Erro ao reativar"));
                        }}
                        className="text-xs rounded border border-border px-2 py-1 text-emerald-700"
                      >
                        Reativar
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          archive(p.id)
                            .then(() => toast.success("Arquivado (não apagado)"))
                            .catch((e: any) => toast.error(e?.message ?? "Erro ao arquivar"));
                        }}
                        className="text-xs rounded border border-border px-2 py-1 text-amber-700"
                      >
                        Arquivar
                      </button>
                    )}
                    <button onClick={() => { if (confirm(`Apagar "${p.name}"?`)) { remove(p.id).then(() => toast.success("Apagado")).catch((e) => toast.error(e?.message ?? "Erro")); } }}
                      className="text-xs rounded border border-border px-2 py-1 text-red-700">Apagar</button>

                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-center text-muted-foreground py-10">Nenhum produto encontrado.</p>}
        </div>
      </div>
    </div>
    </AdminShell>
  );
}
