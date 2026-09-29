import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminShell, PRODUCTS_TABS } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { uploadProductImage } from "@/lib/api/supaProducts";
import { CATEGORIES, emptyProduct, slugify, useProductsStore } from "@/stores/productsStore";

const productSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da roupa.").max(120),
  category_id: z.enum(["feminino", "masculino"]),
  price: z.number().finite().positive("Informe um preço maior que zero.").max(1000000),
  stock: z.number().int().min(0, "O estoque não pode ser negativo.").max(1000000),
  description: z.string().trim().max(2000),
});

const inputClass = "w-full min-h-11 rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ProductRegistration() {
  const navigate = useNavigate();
  const create = useProductsStore((state) => state.create);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("feminino");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      toast.error("Escolha uma imagem de até 8 MB.");
      event.target.value = "";
      return;
    }
    setPhoto(file);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const parsed = productSchema.safeParse({
      name, category_id: category,
      price: price.trim() ? Number(price) : NaN,
      stock: stock.trim() ? Number(stock) : NaN,
      description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Confira os dados do produto.");
      return;
    }
    if (!photo) { toast.error("Adicione uma foto da roupa."); return; }

    setSaving(true);
    try {
      const url = await uploadProductImage(photo);
      const product = parsed.data;
      await create({
        ...emptyProduct(),
        ...product,
        slug: `${slugify(product.name)}-${Date.now().toString(36)}`,
        images: [{ id: crypto.randomUUID(), product_id: "new", url, position: 0, is_primary: true }],
      });
      toast.success("Roupa cadastrada com sucesso.");
      await navigate({ to: "/produtos" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar a roupa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell active="produtos" tabs={PRODUCTS_TABS}>
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-8 sm:py-10">
        <Link to="/produtos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para produtos
        </Link>
        <div className="mt-6 mb-8 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase text-primary">Catálogo / Nova peça</p>
          <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">Cadastrar roupa</h1>
        </div>

        <form onSubmit={save} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
          <div className="space-y-6 min-w-0">
            <div className="space-y-2">
              <label htmlFor="product-name" className="text-sm font-medium">Nome da roupa *</label>
              <input id="product-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required placeholder="Ex.: Vestido longo de festa" className={inputClass} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="product-category" className="text-sm font-medium">Categoria *</label>
                <select id="product-category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
                  {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="product-price" className="text-sm font-medium">Preço (R$) *</label>
                <input id="product-price" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required placeholder="0,00" className={inputClass} />
              </div>
            </div>
            <div className="space-y-2 sm:max-w-[calc(50%-0.625rem)]">
              <label htmlFor="product-stock" className="text-sm font-medium">Quantidade em estoque *</label>
              <input id="product-stock" type="number" inputMode="numeric" min="0" max="1000000" step="1" value={stock} onChange={(event) => setStock(event.target.value)} required placeholder="0" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label htmlFor="product-description" className="text-sm font-medium">Descrição</label>
              <textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={5} placeholder="Tecido, caimento e detalhes da peça" className={inputClass} />
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <label htmlFor="product-photo" className="block text-sm font-medium">Foto da roupa *</label>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md border border-dashed border-border bg-muted/30">
              {preview ? (
                <img src={preview} alt="Prévia da roupa selecionada" className="h-full w-full object-contain" />
              ) : (
                <label htmlFor="product-photo" className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm">Selecionar foto</span>
                </label>
              )}
              {preview && <Button type="button" size="icon" variant="secondary" title="Remover foto" aria-label="Remover foto" className="absolute right-2 top-2" onClick={() => setPhoto(null)}><X /></Button>}
            </div>
            <input id="product-photo" type="file" accept="image/*" onChange={selectPhoto} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-foreground" />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border pt-6 lg:col-span-2">
            <Button type="submit" disabled={saving} className="min-w-36">
              {saving && <Loader2 className="animate-spin" />}{saving ? "Salvando…" : "Cadastrar roupa"}
            </Button>
            <Button asChild type="button" variant="outline"><Link to="/produtos">Cancelar</Link></Button>
          </div>
        </form>
      </main>
    </AdminShell>
  );
}