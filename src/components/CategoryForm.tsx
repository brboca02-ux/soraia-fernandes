import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Upload, X } from "lucide-react";
import {
  useCategoriesStore, emptyCategory, slugify,
  type Category, type CategoryStatus,
} from "@/stores/categoriesStore";

export function CategoryForm({ categoryId }: { categoryId?: string }) {
  const navigate = useNavigate();
  const existing = useCategoriesStore((s) => (categoryId ? s.categories.find((c) => c.id === categoryId) : undefined));
  const create = useCategoriesStore((s) => s.create);
  const update = useCategoriesStore((s) => s.update);

  const [data, setData] = useState<Omit<Category, "id" | "store_id" | "created_at" | "product_count">>(() =>
    existing
      ? {
          name: existing.name, slug: existing.slug, description: existing.description,
          image: existing.image, hover_image: existing.hover_image, sort_order: existing.sort_order,
          featured: existing.featured, show_home: existing.show_home,
          show_menu: existing.show_menu, show_menu_mobile: existing.show_menu_mobile,
          status: existing.status, meta_title: existing.meta_title, meta_description: existing.meta_description,
        }
      : emptyCategory(),
  );

  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) => setData((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    if (!existing && data.name && !data.slug) set("slug", slugify(data.name));
  }, [data.name]); // eslint-disable-line

  const readFile = (file: File, k: "image" | "hover_image") => {
    const r = new FileReader();
    r.onload = () => set(k, String(r.result));
    r.readAsDataURL(file);
  };

  const save = async () => {
    if (!data.name.trim()) return toast.error("Informe o nome da categoria.");
    const payload = { ...data, slug: data.slug || slugify(data.name) };
    try {
      if (existing) { await update(existing.id, payload); toast.success("Categoria atualizada"); }
      else { await create(payload); toast.success("Categoria criada"); }
      navigate({ to: "/categorias" });
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <Link to="/categorias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar para categorias
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {existing ? "Editar" : "Nova"}
            </p>
            <h1 className="font-display text-3xl tracking-tight mt-1">
              {existing ? existing.name : "Cadastrar Categoria"}
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate({ to: "/categorias" })}
              className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancelar</button>
            <button onClick={save}
              className="rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/85">
              {existing ? "Salvar alterações" : "Criar categoria"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Informações">
              <Field label="Nome">
                <input value={data.name} onChange={(e) => set("name", e.target.value)} className={input} />
              </Field>
              <Field label="Slug">
                <input value={data.slug} onChange={(e) => set("slug", slugify(e.target.value))} className={input} placeholder="masculino" />
              </Field>
              <Field label="Descrição">
                <textarea value={data.description} onChange={(e) => set("description", e.target.value)} rows={3} className={input} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Ordem de Exibição">
                  <input type="number" value={data.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={input} />
                </Field>
                <Field label="Status">
                  <select value={data.status} onChange={(e) => set("status", e.target.value as CategoryStatus)} className={input}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </Field>
              </div>
            </Card>

            <Card title="Imagens" hint="Proporção recomendada: 4:5 ou paisagem editorial.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImagePicker label="Imagem Capa" value={data.image} onPick={(f) => readFile(f, "image")} onClear={() => set("image", "")} />
                <ImagePicker label="Imagem Hover (opcional)" value={data.hover_image} onPick={(f) => readFile(f, "hover_image")} onClear={() => set("hover_image", "")} />
              </div>
            </Card>

            <Card title="Visibilidade">
              <Toggle label="Exibir na Home" checked={data.show_home} onChange={(v) => set("show_home", v)} />
              <Toggle label="Destacar Categoria" checked={data.featured} onChange={(v) => set("featured", v)} />
              <Toggle label="Mostrar no menu principal" checked={data.show_menu} onChange={(v) => set("show_menu", v)} />
              <Toggle label="Mostrar no menu mobile" checked={data.show_menu_mobile} onChange={(v) => set("show_menu_mobile", v)} />
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="SEO">
              <Field label="Meta Title">
                <input value={data.meta_title} onChange={(e) => set("meta_title", e.target.value)} className={input} maxLength={60} />
                <p className="text-[11px] text-muted-foreground mt-1">{data.meta_title.length}/60</p>
              </Field>
              <Field label="Meta Description">
                <textarea value={data.meta_description} onChange={(e) => set("meta_description", e.target.value)} rows={3} className={input} maxLength={160} />
                <p className="text-[11px] text-muted-foreground mt-1">{data.meta_description.length}/160</p>
              </Field>
            </Card>
            <p className="text-xs text-muted-foreground">
              Multiempresa: registros salvos com <code className="font-mono">store_id</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? "bg-foreground" : "bg-muted"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function ImagePicker({ label, value, onPick, onClear }: { label: string; value: string; onPick: (f: File) => void; onClear: () => void }) {
  return (
    <div>
      <p className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
      {value ? (
        <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted ring-1 ring-border">
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button onClick={onClear} className="absolute top-1 right-1 rounded bg-background/90 p-1 text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex aspect-[4/5] flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 text-muted-foreground">
          <Upload className="h-5 w-5" />
          <span className="text-xs">Selecionar imagem</span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}
