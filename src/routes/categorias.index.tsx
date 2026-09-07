import { AdminShell } from "@/components/AdminShell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ImageOff, Star, ExternalLink } from "lucide-react";
import { useCategoriesStore, type CategoryStatus } from "@/stores/categoriesStore";
import { useProductsStore } from "@/stores/productsStore";
import { useSiteMedia } from "@/lib/api/siteMedia";

export const Route = createFileRoute("/categorias/")({
  head: () => ({ meta: [{ title: "Categorias — Soraia Fernandes" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CategoriesListPage,
});

const statusBadge: Record<CategoryStatus, string> = {
  ativo: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inativo: "bg-muted text-muted-foreground ring-border",
  arquivado: "bg-amber-50 text-amber-700 ring-amber-200",
};

function CategoriesListPage() {
  const navigate = useNavigate();
  const categories = useCategoriesStore((s) => s.categories);
  const remove = useCategoriesStore((s) => s.remove);
  const products = useProductsStore((s) => s.products);
  const media = useSiteMedia();

  const getCategoryImage = (c: any) => {
    if (c.slug === "feminino" && media.cat_feminino) return media.cat_feminino;
    if (c.slug === "masculino" && media.cat_masculino) return media.cat_masculino;
    return c.image;
  };
  const countFor = (category: { id: string; slug: string }) =>
    products.filter(
      (p) =>
        (p.category_id === category.id || p.category_id === category.slug) &&
        p.status !== "arquivado",
    ).length;

  return (
    <AdminShell active="produtos" tabs={[{ label: "Produtos", to: "/produtos" }, { label: "Categorias", to: "/categorias" }]}>
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Catálogo</p>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-1">Categorias</h1>
            <p className="text-sm text-muted-foreground mt-1">{categories.length} categorias</p>
          </div>
          <Link
            to="/categorias/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/85"
          >
            <Plus className="h-4 w-4" /> Nova Categoria
          </Link>
        </div>

        {/* Preview faixa horizontal */}
        <div className="mb-6 rounded-xl border border-border bg-background p-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Pré-visualização da home</h2>
          <div className="flex md:grid md:grid-cols-5 gap-2 md:gap-3 overflow-x-auto -mx-1 px-1 scrollbar-none">
            {categories.filter((c) => c.show_home && c.status === "ativo").map((c) => {
              const imgUrl = getCategoryImage(c);
              return (
                <div key={c.id} className="group relative shrink-0 w-[140px] md:w-auto h-[100px] md:h-[120px] overflow-hidden rounded-md bg-secondary">
                  {imgUrl ? (
                    <img src={imgUrl} alt={c.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                      <ImageOff className="h-5 w-5 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/30 group-hover:bg-background/55 transition-colors" />
                  <div className="absolute inset-x-0 bottom-0 px-3 py-2">
                    <h3 className="font-medium text-xs md:text-sm text-gold">{c.name}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Categoria</th>
                <th className="text-left font-medium px-4 py-3">Slug</th>
                <th className="text-left font-medium px-4 py-3">Produtos</th>
                <th className="text-left font-medium px-4 py-3">Home / Menu</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                        {getCategoryImage(c) ? <img src={getCategoryImage(c)} alt="" className="h-full w-full object-cover" />
                          : <div className="h-full w-full flex items-center justify-center text-muted-foreground"><ImageOff className="h-4 w-4" /></div>}
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-1.5">
                          {c.name}
                          {c.featured && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}
                        </p>
                        <p className="text-xs text-muted-foreground">ordem {c.sort_order}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.slug}</td>
                  <td className="px-4 py-3">{countFor(c)}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {c.show_home && <span className="rounded bg-muted px-1.5 py-0.5">Home</span>}
                      {c.show_menu && <span className="rounded bg-muted px-1.5 py-0.5">Menu</span>}
                      {c.show_menu_mobile && <span className="rounded bg-muted px-1.5 py-0.5">Mobile</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 capitalize ${statusBadge[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => navigate({ to: "/categorias/$id/editar", params: { id: c.id } })}
                        className="rounded p-1.5 hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { if (confirm(`Remover definitivamente "${c.name}"? Esta ação não pode ser desfeita.`)) { remove(c.id); toast.success("Categoria removida"); } }}
                        className="rounded p-1.5 hover:bg-muted text-red-700" title="Remover"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {categories.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-background p-3 flex gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
                {getCategoryImage(c) && <img src={getCategoryImage(c)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <p className="font-medium truncate">{c.name}</p>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 capitalize ${statusBadge[c.status]}`}>{c.status}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">/{c.slug}</p>
                <p className="text-xs text-muted-foreground mt-1">{countFor(c)} produtos · ordem {c.sort_order}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => navigate({ to: "/categorias/$id/editar", params: { id: c.id } })}
                    className="text-xs rounded border border-border px-2 py-1">Editar</button>
                  <button onClick={() => { if (confirm(`Remover "${c.name}"?`)) { remove(c.id); toast.success("Removida"); } }}
                    className="text-xs rounded border border-border px-2 py-1 text-red-700">Remover</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </AdminShell>
  );
}
