import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { useProductsStore } from "@/stores/productsStore";
import { deletePromotion, listPromotions, savePromotion, type Promotion } from "@/lib/promotions";

export const Route = createFileRoute("/promocoes/")({
  head: () => ({ meta: [
    { title: "Promoções — Painel Soraia Fernandes" },
    { name: "description", content: "Gerencie as promoções e os produtos participantes da loja Soraia Fernandes." },
    { property: "og:title", content: "Promoções — Painel Soraia Fernandes" },
    { property: "og:description", content: "Gerencie as promoções e os produtos participantes da loja Soraia Fernandes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: PromotionsPage,
});

type Draft = Omit<Promotion, "id" | "created_at" | "updated_at"> & { id?: string };
const BLANK: Draft = { name: "", active: false, mode: "percentage", value: 0, product_ids: [], minimum_subtotal: 0, starts_at: null, ends_at: null };
const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

function PromotionsPage() {
  const products = useProductsStore((s) => s.products);
  const hydrate = useProductsStore((s) => s.hydrate);
  const [rows, setRows] = useState<Promotion[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = async () => { setRows(await listPromotions()); setLoading(false); };

  useEffect(() => {
    void hydrate();
    void refresh().catch(() => { setLoading(false); toast.error("Não foi possível carregar as promoções."); });
  }, [hydrate]);

  const filtered = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const update = (value: Partial<Draft>) => setDraft((previous) => previous ? { ...previous, ...value } : previous);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || !draft.name.trim() || !Number.isFinite(draft.value) || draft.value <= 0 || (draft.mode === "percentage" && draft.value > 100) || draft.product_ids.length === 0 || draft.minimum_subtotal < 0 || (draft.starts_at && draft.ends_at && draft.starts_at >= draft.ends_at)) {
      toast.error("Revise o nome, desconto, datas e selecione ao menos um produto."); return;
    }
    setBusy(true);
    try {
      await savePromotion({ ...draft, name: draft.name.trim() });
      await refresh(); setDraft(null);
      toast.success("Promoção salva.");
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(row: Promotion) {
    if (!window.confirm(`Excluir a promoção “${row.name}”?`)) return;
    try { await deletePromotion(row.id); await refresh(); if (draft?.id === row.id) setDraft(null); toast.success("Promoção excluída."); }
    catch (error) { toast.error((error as Error).message); }
  }

  return <AdminShell active="promocoes">
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs uppercase text-muted-foreground">Marketing</p><h1 className="font-display text-3xl">Promoções</h1></div>
        <Button onClick={() => { setDraft({ ...BLANK, product_ids: [] }); setSearch(""); }}><Plus /> Nova promoção</Button>
      </div>

      {draft && <form onSubmit={submit} className="mb-10 space-y-6 border-t border-border pt-6">
        <h2 className="text-xl font-semibold">{draft.id ? "Editar promoção" : "Nova promoção"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Nome<input required maxLength={100} className={INPUT} value={draft.name} onChange={(e) => update({ name: e.target.value })} /></label>
          <label className="text-sm">Regra de desconto<select className={INPUT} value={draft.mode} onChange={(e) => update({ mode: e.target.value as Draft["mode"] })}><option value="percentage">Percentual sobre produtos participantes</option><option value="fixed_price">Preço fixo por unidade participante</option></select></label>
          <label className="text-sm">{draft.mode === "percentage" ? "Desconto (%)" : "Preço promocional por unidade (R$)"}<input required type="number" min="0.01" max={draft.mode === "percentage" ? 100 : undefined} step="0.01" className={INPUT} value={draft.value || ""} onChange={(e) => update({ value: Number(e.target.value) })} /></label>
          <label className="text-sm">Compra mínima dos participantes (R$)<input type="number" min="0" step="0.01" className={INPUT} value={draft.minimum_subtotal} onChange={(e) => update({ minimum_subtotal: Number(e.target.value) })} /></label>
          <label className="text-sm">Início (opcional)<input type="datetime-local" className={INPUT} value={draft.starts_at ? draft.starts_at.slice(0, 16) : ""} onChange={(e) => update({ starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
          <label className="text-sm">Fim (opcional)<input type="datetime-local" className={INPUT} value={draft.ends_at ? draft.ends_at.slice(0, 16) : ""} onChange={(e) => update({ ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(e) => update({ active: e.target.checked })} /> Ativa</label>
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Produtos participantes ({draft.product_ids.length})</h3><div className="relative"><Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" /><input aria-label="Buscar produtos" className={`${INPUT} pl-8`} placeholder="Buscar produtos" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
          <div className="max-h-64 overflow-y-auto border-y border-border divide-y divide-border">
            {filtered.map((p) => <label key={p.id} className="flex cursor-pointer items-center gap-3 px-2 py-3 text-sm"><input type="checkbox" checked={draft.product_ids.includes(p.id)} onChange={(e) => update({ product_ids: e.target.checked ? [...draft.product_ids, p.id] : draft.product_ids.filter((id) => id !== p.id) })} /><span className="flex-1">{p.name}</span><span className="text-muted-foreground">R$ {p.price.toFixed(2)}</span></label>)}
            {!filtered.length && <p className="p-3 text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
          </div>
        </div>
        <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar promoção"}</Button><Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancelar</Button></div>
      </form>}

      <div className="divide-y divide-border border-y border-border">
        {loading && <p className="py-5 text-sm text-muted-foreground">Carregando promoções…</p>}
        {!loading && !rows.length && <p className="py-5 text-sm text-muted-foreground">Nenhuma promoção cadastrada.</p>}
        {rows.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-4 py-5">
          <div className="min-w-0 flex-1"><h2 className="font-semibold">{row.name}</h2><p className="text-sm text-muted-foreground">{row.mode === "percentage" ? `${row.value}% de desconto` : `R$ ${Number(row.value).toFixed(2)} por unidade`} · {row.product_ids.length} produtos · {row.active ? "Ativa" : "Inativa"}</p></div>
          <Button variant="outline" size="icon" title="Editar promoção" aria-label={`Editar ${row.name}`} onClick={() => { setDraft({ ...row }); setSearch(""); }}><Pencil /></Button>
          <Button variant="ghost" size="icon" title="Excluir promoção" aria-label={`Excluir ${row.name}`} onClick={() => void remove(row)}><Trash2 /></Button>
        </div>)}
      </div>
    </main>
  </AdminShell>;
}