import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Star, StarOff, Upload, GripVertical, X, Plus, Loader2, Sparkles, Check, ChevronDown, ChevronRight, Image as ImageIcon } from "lucide-react";
import {
  useProductsStore, CATEGORIES, SIZES, emptyProduct, slugify,
  type Product, type ProductImage, type ProductVariant, type ProductStatus,
} from "@/stores/productsStore";
import { uploadProductImage } from "@/lib/api/supaProducts";
import { analyzeProductImage, type DetectedColor } from "@/lib/api/analyzeProduct.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { computeFallbackSizes } from "@/lib/products/variantSizes";

const uid = () => Math.random().toString(36).slice(2, 10);

export function ProductForm({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const existing = useProductsStore((s) => (productId ? s.products.find((p) => p.id === productId) : undefined));
  const create = useProductsStore((s) => s.create);
  const update = useProductsStore((s) => s.update);

  const [data, setData] = useState<Omit<Product, "id" | "store_id" | "created_at">>(() =>
    existing
      ? {
          name: existing.name, slug: existing.slug, description: existing.description,
          category_id: existing.category_id, brand: existing.brand, sku: existing.sku,
          price: existing.price, sale_price: existing.sale_price, stock: existing.stock,
          reserved_stock: existing.reserved_stock ?? 0,
          minimum_stock: existing.minimum_stock ?? 5,
          track_stock: existing.track_stock ?? true,
          weight: existing.weight, status: existing.status,
          showcase: existing.showcase ?? false,
          meta_title: existing.meta_title, meta_description: existing.meta_description,
          images: existing.images, variants: existing.variants,
        }
      : emptyProduct(),
  );

  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) => setData((d) => ({ ...d, [k]: v }));

  // Auto-slug while creating new
  useEffect(() => {
    if (!existing && data.name && !data.slug) set("slug", slugify(data.name));
  }, [data.name]); // eslint-disable-line

  // ---------- Images ----------
  const dragIdx = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    setUploading(true);
    try {
      const urls = await Promise.all(arr.map((f) => uploadProductImage(f)));
      setData((d) => {
        const next = [...d.images];
        urls.forEach((url) => {
          next.push({
            id: uid(), product_id: productId ?? "new", url,
            position: next.length, is_primary: next.length === 0,
          });
        });
        return { ...d, images: next };
      });
    } catch (e) {
      toast.error("Falha no upload: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (id: string) => setData((d) => {
    const next = d.images.filter((i) => i.id !== id).map((i, idx) => ({ ...i, position: idx }));
    if (next.length && !next.some((i) => i.is_primary)) next[0].is_primary = true;
    return { ...d, images: next };
  });

  const setPrimary = (id: string) => setData((d) => ({
    ...d, images: d.images.map((i) => ({ ...i, is_primary: i.id === id })),
  }));

  const reorder = (from: number, to: number) => setData((d) => {
    const next = [...d.images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return { ...d, images: next.map((i, idx) => ({ ...i, position: idx })) };
  });

  // ---------- Grouped Variants (by Color) ----------
  const [sizeMode, setSizeMode] = useState<"unico" | "multi">(() => {
    if (existing?.variants.length) {
      const hasNonUnico = existing.variants.some(v => v.size !== "Único");
      return hasNonUnico ? "multi" : "unico";
    }
    return "unico";
  });

  const groupedVariants = useMemo(() => {
    const groups: Record<string, { color: string; color_hex: string | null; variants: ProductVariant[] }> = {};
    data.variants.forEach(v => {
      const key = v.color.toLowerCase().trim() || "sem-cor";
      if (!groups[key]) {
        groups[key] = { color: v.color, color_hex: v.color_hex || null, variants: [] };
      }
      groups[key].variants.push(v);
    });
    return Object.values(groups);
  }, [data.variants]);

  const updateColorGroup = (oldColor: string, patch: { color?: string; color_hex?: string | null }) => {
    setData(d => ({
      ...d,
      variants: d.variants.map(v => {
        if (v.color.toLowerCase().trim() === oldColor.toLowerCase().trim()) {
          return { ...v, ...patch };
        }
        return v;
      })
    }));
  };

  const removeColorGroup = (color: string) => {
    setData(d => ({
      ...d,
      variants: d.variants.filter(v => v.color.toLowerCase().trim() !== color.toLowerCase().trim())
    }));
  };

  const toggleSizeInGroup = (color: string, size: string) => {
    const key = color.toLowerCase().trim();
    const group = groupedVariants.find(g => (g.color.toLowerCase().trim() || "sem-cor") === (key || "sem-cor"));
    if (!group) return;

    const exists = group.variants.find(v => v.size === size);
    if (exists) {
      if (group.variants.length > 1) {
        setData(d => ({
          ...d,
          variants: d.variants.filter(v => !(v.color.toLowerCase().trim() === key && v.size === size))
        }));
      } else {
        toast.error("Uma cor precisa ter ao menos um tamanho.");
      }
    } else {
      setData(d => ({
        ...d,
        variants: [...d.variants, {
          id: uid(),
          product_id: productId ?? "new",
          size,
          color: group.color,
          color_hex: group.color_hex,
          stock: 0
        }]
      }));
    }
  };

  const addColorGroup = () => {
    const newColor = "Nova Cor";
    setData(d => ({
      ...d,
      variants: [...d.variants, {
        id: uid(),
        product_id: productId ?? "new",
        size: sizeMode === "unico" ? "Único" : "M",
        color: newColor,
        color_hex: null,
        stock: 0
      }]
    }));
  };

  const updateVariantStock = (id: string, stock: number) => {
    setData(d => ({
      ...d,
      variants: d.variants.map(v => v.id === id ? { ...v, stock } : v)
    }));
  };

  // ---------- AI variant suggestion ----------
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiColors, setAiColors] = useState<DetectedColor[]>([]);
  const [aiSizesSuggested, setAiSizesSuggested] = useState<string[]>([]);
  const [selColors, setSelColors] = useState<Set<string>>(new Set());
  const [selSizes, setSelSizes] = useState<Set<string>>(new Set());
  const [customColor, setCustomColor] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [perStock, setPerStock] = useState<number>(5);
  const [aiCategory, setAiCategory] = useState<string>("feminino");
  const [aiPieceType, setAiPieceType] = useState<string>("");
  const [aiMetaTitle, setAiMetaTitle] = useState<string>("");
  const [aiMetaDescription, setAiMetaDescription] = useState<string>("");
  const [aiBrand, setAiBrand] = useState<string>("");
  const [aiBrands, setAiBrands] = useState<string[]>([]);
  const [aiImageUrls, setAiImageUrls] = useState<string[]>([]);

  const norm = (s: string) => s.trim().toLowerCase();

  const toDataUrl = async (url: string) => {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ""));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  };

  const runAnalysis = async () => {
    if (data.images.length === 0) {
      toast.error("Envie ao menos uma imagem antes de usar a IA.");
      return;
    }
    setAiLoading(true);
    try {
      // Ordena com a principal primeiro e analisa TODAS as fotos (cada foto pode ser uma cor).
      const ordered = [...data.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
      const used = ordered.slice(0, 8);
      const imageDataUrls = await Promise.all(used.map((i) => toDataUrl(i.url)));
      setAiImageUrls(used.map((i) => i.url));

      const result = await analyzeProductImage({ data: { imageDataUrls } });
      // Dedupe colors by normalized name
      const seenC = new Set<string>();
      const colorsRaw = result.colors.length ? result.colors : [{ name: result.color, hex: "", image_index: 0 }];
      const colors = colorsRaw.filter((c) => {
        const k = norm(c.name);
        if (!k || seenC.has(k)) return false;
        seenC.add(k);
        return true;
      });
      // Dedupe sizes
      const seenS = new Set<string>();
      const sizes = result.sizes_suggested.filter((s) => {
        const k = norm(s);
        if (!k || seenS.has(k)) return false;
        seenS.add(k);
        return true;
      });
      setAiColors(colors);
      setAiSizesSuggested(sizes);
      setSelColors(new Set(colors.map((c) => c.name)));
      setSelSizes(new Set(sizes));
      setAiCategory(result.category_id);
      setAiPieceType(result.piece_type || "");
      setAiMetaTitle(result.meta_title || "");
      setAiMetaDescription(result.meta_description || "");
      setAiBrand(result.brand || "");
      setAiBrands(result.brands || []);
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    } finally {
      setAiLoading(false);
    }
  };


  const openAiSuggest = async () => {
    setAiOpen(true);
    try { await runAnalysis(); } catch { setAiOpen(false); }
  };

  const reanalyze = async () => {
    try { await runAnalysis(); toast.success("Análise atualizada"); } catch { /* toast já exibido */ }
  };


  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  const addCustomColor = () => {
    const name = customColor.trim();
    if (!name) return;
    const key = norm(name);
    const exists = aiColors.find((c) => norm(c.name) === key);
    if (!exists) {
      setAiColors((c) => [...c, { name, hex: "", image_index: 0 }]);
      setSelColors((s) => new Set(s).add(name));
    } else {
      setSelColors((s) => new Set(s).add(exists.name));
      toast.info("Cor já existe na lista");
    }
    setCustomColor("");
  };

  const addCustomSize = () => {
    const s = customSize.trim().toUpperCase();
    if (!s) return;
    const key = norm(s);
    const exists = aiSizesSuggested.find((x) => norm(x) === key);
    if (!exists) {
      setAiSizesSuggested((arr) => [...arr, s]);
      setSelSizes((set) => new Set(set).add(s));
    } else {
      setSelSizes((set) => new Set(set).add(exists));
      toast.info("Tamanho já existe na lista");
    }
    setCustomSize("");
  };

  const applyAiVariants = () => {
    // Dedupe selections (case-insensitive)
    const colsMap = new Map<string, string>();
    [...selColors].forEach((c) => { const k = norm(c); if (k && !colsMap.has(k)) colsMap.set(k, c); });
    const szsMap = new Map<string, string>();
    [...selSizes].forEach((s) => { const k = norm(s); if (k && !szsMap.has(k)) szsMap.set(k, s); });
    const cols = [...colsMap.values()];
    const szs = sizeMode === "unico" ? ["Único"] : [...szsMap.values()];
    
    if (cols.length === 0 || (sizeMode !== "unico" && szs.length === 0)) {
      toast.error("Selecione ao menos uma cor.");
      return;
    }
    const hexByName = new Map(aiColors.map((c) => [norm(c.name), c.hex]));
    const variants: ProductVariant[] = [];
    cols.forEach((c) => {
      szs.forEach((s) => {
        variants.push({
          id: uid(),
          product_id: productId ?? "new",
          size: s,
          color: c,
          color_hex: hexByName.get(norm(c)) || null,
          stock: Math.max(0, Math.floor(perStock) || 0),
        });
      });
    });
    setData((d) => ({
      ...d,
      variants,
      category_id: aiCategory || d.category_id,
      name: d.name.trim() || aiPieceType.trim() || d.name,
      meta_title: aiMetaTitle ? aiMetaTitle.slice(0, 60) : d.meta_title,
      meta_description: aiMetaDescription ? aiMetaDescription.slice(0, 160) : d.meta_description,
    }));
    setAiOpen(false);
    toast.success(`${variants.length} variações criadas e aplicadas`);
  };



  // ---------- Save ----------
  const save = async () => {
    if (!data.name.trim()) return toast.error("Informe o nome do produto.");
    if (data.price <= 0) return toast.error("Informe um preço válido.");
    const payload = { ...data, slug: data.slug || slugify(data.name) };
    setSaving(true);
    try {
      if (existing) {
        await update(existing.id, payload);
        toast.success("Produto atualizado");
      } else {
        await create(payload);
        toast.success("Produto criado");
      }
      navigate({ to: "/produtos" });
    } catch (e) {
      toast.error("Erro ao salvar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <Link to="/produtos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar para produtos
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {existing ? "Editar" : "Novo"}
            </p>
            <h1 className="font-display text-3xl tracking-tight mt-1">
              {existing ? existing.name : "Cadastrar Produto"}
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate({ to: "/produtos" })}
              className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancelar</button>
            <button onClick={save} disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:bg-foreground/85 disabled:opacity-60">
              {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
              {existing ? "Salvar alterações" : "Criar produto"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Basics */}
            <Card title="Informações Básicas">
              <Field label="Nome">
                <input value={data.name} onChange={(e) => set("name", e.target.value)} className={input} />
              </Field>
              <Field label="Descrição">
                <textarea value={data.description} onChange={(e) => set("description", e.target.value)} rows={4} className={input} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Categoria">
                  <select value={data.category_id} onChange={(e) => set("category_id", e.target.value)} className={input}>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Marca">
                  <input value={data.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ex: Nike, Lacoste, Soraia Fernandes" className={input} />
                </Field>
                <Field label="SKU">
                  <input value={data.sku} onChange={(e) => set("sku", e.target.value)} className={input} />
                </Field>
                <Field label="Status">
                  <select value={data.status} onChange={(e) => set("status", e.target.value as ProductStatus)} className={input}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </Field>
                <label className="flex items-end gap-2 pb-1.5">
                  <input type="checkbox" checked={data.showcase}
                    onChange={(e) => set("showcase", e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm">Mostrar na vitrine</span>
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Preço (R$)">
                  <input type="number" step="0.01" value={data.price} onChange={(e) => set("price", Number(e.target.value))} className={input} />
                </Field>
                <Field label="Preço Promocional">
                  <input type="number" step="0.01" value={data.sale_price ?? ""} onChange={(e) => set("sale_price", e.target.value ? Number(e.target.value) : null)} className={input} />
                </Field>
                <Field label="Estoque">
                  <input type="number" value={data.stock} onChange={(e) => set("stock", Number(e.target.value))} className={input} />
                </Field>
                <Field label="Peso (kg)">
                  <input type="number" step="0.01" value={data.weight} onChange={(e) => set("weight", Number(e.target.value))} className={input} />
                </Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
                <Field label="Estoque mínimo">
                  <input type="number" min={0} value={data.minimum_stock}
                    onChange={(e) => set("minimum_stock", Number(e.target.value))} className={input} />
                </Field>
                <Field label="Estoque reservado">
                  <input type="number" min={0} value={data.reserved_stock}
                    onChange={(e) => set("reserved_stock", Number(e.target.value))} className={input} />
                </Field>
                <label className="flex items-end gap-2 pb-1.5">
                  <input type="checkbox" checked={data.track_stock}
                    onChange={(e) => set("track_stock", e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm">Controlar estoque</span>
                </label>
              </div>
            </Card>

            {/* Images */}
            <Card title="Imagens" hint="Proporção recomendada: 4:5. Arraste para reordenar.">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/30"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Arraste imagens ou clique para selecionar</span>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => e.target.files && addFiles(e.target.files)} />
              </label>

              {data.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {data.images.map((img, idx) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => (dragIdx.current = idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragIdx.current !== null) reorder(dragIdx.current, idx); dragIdx.current = null; }}
                      className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted group ring-1 ring-border"
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      
                      {/* Image-Variant Link Indicators */}
                      <div className="absolute bottom-1 left-1 flex flex-wrap gap-1 max-w-[calc(100%-8px)]">
                        {groupedVariants
                          .filter(g => g.color && img.url.toLowerCase().includes(g.color.toLowerCase().replace(/\s+/g, '-')))
                          .map(g => (
                            <div 
                              key={g.color}
                              className="h-3 w-3 rounded-full border border-white/40 shadow-sm"
                              style={{ backgroundColor: g.color_hex || "#cfcfcf" }}
                              title={`Vinculado à cor: ${g.color}`}
                            />
                          ))}
                      </div>

                      {img.is_primary && (
                        <span className="absolute top-1 left-1 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded shadow-sm">Principal</span>
                      )}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={(e) => { e.preventDefault(); setPrimary(img.id); }}
                          className="bg-background/90 rounded p-1" title="Definir principal">
                          {img.is_primary ? <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> : <StarOff className="h-3 w-3" />}
                        </button>
                        <button onClick={(e) => { e.preventDefault(); removeImage(img.id); }}
                          className="bg-background/90 rounded p-1 text-destructive" title="Remover">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 bg-background/90 rounded p-0.5 cursor-grab"><GripVertical className="h-3 w-3" /></span>
                    </div>
                  ))}
                  
                  {/* Visual Aid Note */}
                  <div className="col-span-full mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-[10px] text-primary font-medium leading-relaxed">
                      💡 <strong>Dica:</strong> Nomeie as cores conforme aparecem nos nomes dos arquivos das imagens para vinculá-las visualmente.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Variants */}
            <Card 
              title="Variações" 
              hint="Organize por cor e defina o estoque por tamanho."
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                <div className="flex bg-muted p-1 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setSizeMode("unico");
                      // Convert all existing to Único if switching to single
                      setData(d => ({
                        ...d,
                        variants: groupedVariants.map(g => ({
                          ...g.variants[0],
                          size: "Único",
                          stock: g.variants.reduce((acc, v) => acc + v.stock, 0)
                        }))
                      }));
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${sizeMode === 'unico' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Tamanho Único
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeMode("multi")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${sizeMode === 'multi' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Vários Tamanhos
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openAiSuggest}
                    disabled={aiLoading || data.images.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 text-primary px-3 py-2 text-xs font-semibold hover:bg-primary/10 disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    IA: Detectar Cores
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {groupedVariants.map((group) => {
                  const colorKey = group.color.toLowerCase().trim() || "sem-cor";
                  const fallbackSizes = computeFallbackSizes({ category: data.category_id });
                  
                  return (
                    <div key={colorKey} className="group relative rounded-xl border border-border bg-muted/20 overflow-hidden">
                      <div className="p-4 bg-muted/30 border-b border-border flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <div className="relative h-8 w-8 shrink-0">
                            <input 
                              type="color" 
                              value={group.color_hex || "#000000"} 
                              onChange={(e) => updateColorGroup(group.color, { color_hex: e.target.value })}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <div 
                              className="w-full h-full rounded-full border border-border shadow-inner"
                              style={{ backgroundColor: group.color_hex || "#cfcfcf" }}
                            />
                          </div>
                          <input 
                            value={group.color} 
                            onChange={(e) => updateColorGroup(group.color, { color: e.target.value })}
                            placeholder="Nome da cor (ex: Preto)"
                            className="bg-transparent border-none focus:ring-0 font-medium text-sm p-0 h-auto"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Image Link */}
                          <div className="flex items-center gap-1.5">
                            {data.images
                              .filter(img => img.url.toLowerCase().includes(group.color.toLowerCase().replace(/\s+/g, '-')))
                              .slice(0, 1)
                              .map((img) => (
                                <div key={img.id} className="h-8 w-8 rounded border border-border overflow-hidden bg-background">
                                  <img src={img.url} className="h-full w-full object-cover" alt="" />
                                </div>
                              ))}
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {data.images.filter(img => img.url.toLowerCase().includes(group.color.toLowerCase().replace(/\s+/g, '-'))).length} fotos
                            </span>
                          </div>

                          <button 
                            onClick={() => removeColorGroup(group.color)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {sizeMode === "unico" ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Estoque Total</span>
                              <input 
                                type="number" 
                                value={group.variants[0]?.stock || 0}
                                onChange={(e) => updateVariantStock(group.variants[0].id, Number(e.target.value))}
                                className={input}
                              />
                            </div>
                            <div className="pt-5">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-foreground/5 text-foreground/70 uppercase">
                                Tamanho Único
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Fast size selection */}
                            <div>
                              <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Tamanhos disponíveis</span>
                              <div className="flex flex-wrap gap-1.5">
                                {fallbackSizes.map(sz => {
                                  const isActive = group.variants.some(v => v.size === sz);
                                  return (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => toggleSizeInGroup(group.color, sz)}
                                      className={`h-8 min-w-[32px] px-2 rounded border text-xs font-semibold transition ${isActive ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground'}`}
                                    >
                                      {sz}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custom = prompt("Digite o tamanho:");
                                    if (custom) toggleSizeInGroup(group.color, custom.toUpperCase());
                                  }}
                                  className="h-8 w-8 rounded border border-dashed border-border flex items-center justify-center hover:bg-muted"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Individual stock inputs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {group.variants.map(v => (
                                <div key={v.id} className="p-2 rounded-lg bg-background border border-border">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-foreground/80">{v.size}</span>
                                    {group.variants.length > 1 && (
                                      <button onClick={() => toggleSizeInGroup(group.color, v.size)} className="text-muted-foreground hover:text-destructive">
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <input 
                                    type="number" 
                                    value={v.stock}
                                    onChange={(e) => updateVariantStock(v.id, Number(e.target.value))}
                                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button 
                  onClick={addColorGroup} 
                  className="w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition flex flex-col items-center justify-center gap-1"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Adicionar nova cor</span>
                </button>
              </div>

              {/* Total Summary */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                  Resumo: {data.variants.length} variações
                </div>
                <div className="text-sm font-bold">
                  Total em estoque: {data.variants.reduce((acc, v) => acc + v.stock, 0)} pçs
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar: SEO */}
          <div className="space-y-6">
            <Card title="SEO">
              <Field label="Slug">
                <input value={data.slug} onChange={(e) => set("slug", slugify(e.target.value))} className={input} placeholder="camisa-gola-polo-importada" />
              </Field>
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
              Multiempresa: registros serão salvos com <code className="font-mono">store_id</code>.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Cores e tamanhos
                </DialogTitle>
                <DialogDescription>
                  Confirme as cores detectadas e marque os tamanhos disponíveis. Ao aplicar, criamos as variações automaticamente.
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={reanalyze}
                disabled={aiLoading || data.images.length === 0}
                title="Reanalisar a imagem principal"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Reanalisar com IA
              </button>
            </div>
          </DialogHeader>


          {aiLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Analisando imagem com IA...
            </div>
          ) : (
            <div className="space-y-5">
              {/* Categoria + tipo de peça detectados */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                  Detecção da IA · corrija se precisar
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Categoria</span>
                    <select
                      value={aiCategory}
                      onChange={(e) => setAiCategory(e.target.value)}
                      className={`${input} h-9 text-xs`}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Tipo de peça</span>
                    <input
                      value={aiPieceType}
                      onChange={(e) => setAiPieceType(e.target.value)}
                      placeholder="Ex: Camisa gola polo"
                      className={`${input} h-9 text-xs`}
                    />
                  </label>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                      Meta title SEO <span className="text-muted-foreground/70">({aiMetaTitle.length}/60)</span>
                    </span>
                    <input
                      value={aiMetaTitle}
                      onChange={(e) => setAiMetaTitle(e.target.value)}
                      maxLength={60}
                      className={`${input} h-9 text-xs`}
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                      Meta description SEO <span className="text-muted-foreground/70">({aiMetaDescription.length}/160)</span>
                    </span>
                    <textarea
                      value={aiMetaDescription}
                      onChange={(e) => setAiMetaDescription(e.target.value)}
                      rows={2}
                      maxLength={160}
                      className={`${input} text-xs`}
                    />
                  </label>
                </div>
              </div>


              {/* Marca detectada */}
              {aiBrand ? (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                    Marca detectada
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(aiBrands.length ? aiBrands : [aiBrand]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => { set("brand", b); toast.success(`Marca aplicada: ${b}`); }}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                          norm(data.brand) === norm(b)
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:border-foreground/50 text-muted-foreground"
                        }`}
                      >
                        <span className="font-medium">{b}</span>
                        {norm(data.brand) === norm(b) && <Check className="h-3 w-3 text-primary" />}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Clique para aplicar no campo Marca. Atual: <b>{data.brand || "—"}</b>
                  </p>
                </div>
              ) : null}

              {/* Cores */}
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                  Cores detectadas ({aiColors.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {aiColors.map((c) => {
                    const active = selColors.has(c.name);
                    const thumb = aiImageUrls[c.image_index];
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => toggle(selColors, c.name, setSelColors)}
                        title={thumb ? `Detectada na foto ${c.image_index + 1}` : c.name}
                        className={`inline-flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 text-xs transition ${
                          active ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-foreground/50 text-muted-foreground"
                        }`}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={c.name}
                            loading="lazy"
                            className="h-7 w-6 rounded-md object-cover border border-border shrink-0"
                          />
                        ) : null}
                        <span
                          className="h-5 w-5 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: c.hex || "#cfcfcf" }}
                        />
                        <span className="font-medium">{c.name}</span>
                        {active && <Check className="h-3 w-3 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomColor(); } }}
                    placeholder="Adicionar outra cor…"
                    className={`${input} text-xs h-8`}
                  />
                  <button
                    type="button"
                    onClick={addCustomColor}
                    className="rounded-md border border-border px-2 text-xs hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Tamanhos */}
              {sizeMode === "multi" && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                    Tamanhos disponíveis
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiSizesSuggested.map((s) => {
                      const active = selSizes.has(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggle(selSizes, s, setSelSizes)}
                          className={`min-w-10 h-8 px-2.5 text-xs font-semibold rounded-md border transition ${
                            active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/60 text-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSize(); } }}
                      placeholder="Adicionar outro tamanho…"
                      className={`${input} text-xs h-8`}
                    />
                    <button
                      type="button"
                      onClick={addCustomSize}
                      className="rounded-md border border-border px-2 text-xs hover:bg-muted"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Estoque por variação */}
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                  Estoque inicial por variação
                </p>
                <input
                  type="number"
                  min={0}
                  value={perStock}
                  onChange={(e) => setPerStock(Number(e.target.value))}
                  className={`${input} h-9 w-32`}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Serão criadas <b>{selColors.size * (sizeMode === "unico" ? 1 : selSizes.size)}</b> variações (cor × tamanho).
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setAiOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={applyAiVariants}
              disabled={aiLoading || selColors.size === 0 || (sizeMode !== "unico" && selSizes.size === 0)}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Aplicar variações
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

// Re-export type for routes if needed
export type { ProductImage };
