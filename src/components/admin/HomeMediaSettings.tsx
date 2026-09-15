import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, RotateCcw, Star, Loader2 } from "lucide-react";
import catFeminino from "@/assets/cat-feminino.webp.asset.json";
import catMasculino from "@/assets/cat-masculino.webp.asset.json";
import {
  clearSiteMedia,
  loadSiteMedia,
  saveSiteMedia,
  uploadSiteImage,
  type SiteMediaKey,
  type SiteMediaMap,
} from "@/lib/api/siteMedia";
import { useCategoriesStore } from "@/stores/categoriesStore";
import { useProductsStore } from "@/stores/productsStore";
import { uploadProductImage } from "@/lib/api/supaProducts";

const CATEGORY_SLOTS: { key: SiteMediaKey; label: string; fallback: string }[] = [
  { key: "cat_feminino", label: "Categoria Feminino", fallback: catFeminino.url },
  { key: "cat_masculino", label: "Categoria Masculino", fallback: catMasculino.url },
];

function CategorySlot({
  slot,
  current,
  onChange,
}: {
  slot: { key: SiteMediaKey; label: string; fallback: string };
  current?: string;
  onChange: (url?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const categories = useCategoriesStore((s) => s.categories);
  const updateCategory = useCategoriesStore((s) => s.update);

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSiteImage(file, { aspect: 16 / 9, maxWidth: 900 });
      await saveSiteMedia(slot.key, url);
      
      // Tentar atualizar a categoria correspondente no catálogo
      const slug = slot.key === "cat_feminino" ? "feminino" : slot.key === "cat_masculino" ? "masculino" : null;
      if (slug) {
        const cat = categories.find(c => c.slug === slug);
        if (cat) {
          await updateCategory(cat.id, { image: url });
        }
      }

      onChange(url);
      toast.success(`${slot.label} atualizada.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await clearSiteMedia(slot.key);
      onChange(undefined);
      toast.success("Imagem padrão restaurada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao restaurar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-background">
      <div className="aspect-video bg-secondary overflow-hidden">
        <img src={current ?? slot.fallback} alt={slot.label} className="w-full h-full object-cover" />
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium">{slot.label}</p>
        <p className="text-[11px] text-muted-foreground">Otimizamos para WebP 900px automaticamente.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Trocar imagem
          </button>
          {current && (
            <button
              type="button"
              disabled={busy}
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Padrão
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? undefined)}
        />
      </div>
    </div>
  );
}

function ShowcaseRow({ id }: { id: string }) {
  const product = useProductsStore((s) => s.products.find((p) => p.id === id));
  const toggleShowcase = useProductsStore((s) => s.toggleShowcase);
  const update = useProductsStore((s) => s.update);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!product) return null;
  const cover = product.images[0]?.url;

  async function pick(file?: File) {
    if (!file || !product) return;
    setBusy(true);
    try {
      const url = await uploadProductImage(file);
      const rest = product.images
        .slice(1)
        .map((i, idx) => ({ ...i, is_primary: false, position: idx + 1 }));
      const cover = {
        id: product.images[0]?.id ?? crypto.randomUUID(),
        product_id: product.id,
        url,
        position: 0,
        is_primary: true,
      };
      await update(product.id, { images: [cover, ...rest] });
      toast.success("Imagem da vitrine atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="h-14 w-14 shrink-0 rounded-md overflow-hidden bg-secondary">
        {cover ? <img src={cover} alt={product.name} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <p className="text-[11px] text-muted-foreground">{product.showcase ? "Na vitrine" : "Fora da vitrine"}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        Trocar foto
      </button>
      <button
        type="button"
        onClick={() => toggleShowcase(product.id)}
        aria-label={product.showcase ? "Remover da vitrine" : "Adicionar à vitrine"}
        className="p-2 rounded-md border border-border"
      >
        <Star className={`h-4 w-4 ${product.showcase ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? undefined)}
      />
    </li>
  );
}

export function HomeMediaSettings() {
  const [media, setMedia] = useState<SiteMediaMap>({});
  const products = useProductsStore((s) => s.products);
  const hydrate = useProductsStore((s) => s.hydrate);
  const loaded = useProductsStore((s) => s.loaded);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { loadSiteMedia().then(setMedia); }, []);
  useEffect(() => { if (!loaded) void hydrate(); }, [loaded, hydrate]);

  const actives = products.filter((p) => p.status === "ativo");
  const list = showAll ? actives : actives.filter((p) => p.showcase);

  return (
    <>
      <section className="space-y-4 mt-10">
        <div>
          <h2 className="font-display text-xl">Imagens das categorias</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Troque as fotos dos cards Feminino e Masculino da home sem alterar código.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {CATEGORY_SLOTS.map((slot) => (
            <CategorySlot
              key={slot.key}
              slot={slot}
              current={media[slot.key]}
              onChange={(url) => setMedia((m) => ({ ...m, [slot.key]: url }))}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3 mt-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Vitrine rotativa</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha os produtos da vitrine e troque a foto de cada um.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="border border-border rounded-md px-3 py-2 text-xs whitespace-nowrap"
          >
            {showAll ? "Ver só a vitrine" : "Ver todos os produtos"}
          </button>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border px-4 bg-background">
          {list.length === 0 ? (
            <li className="py-6 text-sm text-muted-foreground">Nenhum produto na vitrine ainda.</li>
          ) : (
            list.map((p) => <ShowcaseRow key={p.id} id={p.id} />)
          )}
        </ul>
      </section>
    </>
  );
}
