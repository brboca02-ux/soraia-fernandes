import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { AdminShell, PRODUCTS_TABS } from "@/components/AdminShell";
import { analyzeProductImage, type AnalyzedProduct } from "@/lib/api/analyzeProduct.functions";
import { uploadProductImage } from "@/lib/api/supaProducts";
import { useProductsStore, slugify, SIZES, type ProductVariant } from "@/stores/productsStore";
import { ArrowLeft as BackIcon, Sparkles as AIAcon, X as CloseIcon, Plus as AddIcon, ImageIcon as ImgIcon, Loader2 as Spinner, Check as CheckIcon, Camera as CamIcon } from "lucide-react";

export const Route = createFileRoute("/produtos/rapido")({
  head: () => ({
    meta: [
      { title: "Cadastro Rápido com IA — Soraia Fernandes" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: QuickAddPage,
});

type VariantMode = "sizes" | "color" | "unico";
type QuickImage = { file: File; preview: string; id: string };

const uid = () => Math.random().toString(36).slice(2, 10);

function QuickAddPage() {
  const navigate = useNavigate();
  const createProduct = useProductsStore((s) => s.create);
  const fileRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<QuickImage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");


  const [price, setPrice] = useState<string>("");
  const [salePrice, setSalePrice] = useState<string>("");
  const [stockPerVariant, setStockPerVariant] = useState<string>("10");
  const [sizeMode, setSizeMode] = useState<"unico" | "multi">("multi");
  
  // Local overrides for analyzed data
  const [brand, setBrand] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    if (images.length + arr.length > 8) {
      toast.error("Máximo de 8 imagens.");
      return;
    }

    const newImages: QuickImage[] = [];
    for (const f of arr) {
      if (f.size > 8 * 1024 * 1024) {
        toast.error(`"${f.name}" é muito grande (máx 8MB).`);
        continue;
      }
      const preview = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result ?? ""));
        r.readAsDataURL(f);
      });
      newImages.push({ file: f, preview, id: uid() });
    }
    setImages([...images, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(images.filter((i) => i.id !== id));
  };

  async function handleAnalyze() {
    if (images.length === 0) {
      toast.error("Envie ao menos uma foto.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeProductImage({ 
        data: { imageDataUrls: images.map(i => i.preview) } 
      });
      setAnalyzed(result);
      setBrand(result.brand || "");
      if (result.sizes_suggested.length === 1 && result.sizes_suggested[0] === "Único") {
        setSizeMode("unico");
      } else {
        setSizeMode("multi");
      }
      toast.success("Análise concluída!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  const groupedVariants = useMemo(() => {
    if (!analyzed) return [];
    
    // Convert analyzed colors to our grouped structure
    const sizes = sizeMode === "unico" ? ["Único"] : analyzed.sizes_suggested;
    const stock = Number(stockPerVariant) || 0;

    return analyzed.colors.map((c) => ({
      color: c.name,
      color_hex: c.hex,
      image_index: c.image_index,
      variants: sizes.map(s => ({
        id: uid(),
        size: s,
        color: c.name,
        color_hex: c.hex,
        stock
      }))
    }));
  }, [analyzed, sizeMode, stockPerVariant]);

  async function handleSave() {
    if (images.length === 0 || !analyzed) return;
    const priceNum = Number(price.replace(",", "."));
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    const salePriceNum = salePrice ? Number(salePrice.replace(",", ".")) : null;

    setSaving(true);
    try {
      // 1. Upload das imagens — sequencial para não saturar a rede (8 fotos em
      //    paralelo era a causa do "Failed to fetch").
      const uploadedUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setUploadProgress(`Enviando foto ${i + 1} de ${images.length}...`);
        uploadedUrls.push(await uploadProductImage(images[i]!.file));
      }
      setUploadProgress("Salvando produto...");

      
      // 2. Map variants
      const variants: ProductVariant[] = [];
      groupedVariants.forEach((group) => {
        group.variants.forEach(v => {
          variants.push({
            ...v,
            product_id: "temp",
          } as ProductVariant);
        });
      });

      const slug = slugify(analyzed.name) + "-" + Date.now().toString(36);

      await createProduct({
        name: analyzed.name,
        slug,
        description: analyzed.description,
        category_id: analyzed.category_id,
        brand: brand || analyzed.brand || "Soraia Fernandes",
        sku: "",
        price: priceNum,
        sale_price: salePriceNum && salePriceNum > 0 && salePriceNum < priceNum ? salePriceNum : null,
        stock: variants.reduce((acc, v) => acc + v.stock, 0),
        reserved_stock: 0,
        minimum_stock: 5,
        track_stock: true,
        weight: 0.3,
        status: "ativo",
        showcase: false,
        meta_title: analyzed.meta_title,
        meta_description: analyzed.meta_description,
        images: uploadedUrls.map((url, position) => ({
          id: uid(),
          product_id: "temp",
          url,
          position,
          is_primary: position === 0,
        })),
        variants,
      });

      toast.success("Produto cadastrado com sucesso!");
      navigate({ to: "/produtos" });
    } catch (e) {
      const msg = (e as Error).message || "erro desconhecido";
      toast.error(
        /failed to fetch|network|load failed/i.test(msg)
          ? "Falha de rede ao cadastrar. Verifique a conexão e tente novamente — as fotos já enviadas não serão perdidas."
          : "Não foi possível cadastrar: " + msg,
      );
    } finally {
      setSaving(false);
      setUploadProgress("");
    }

  }

  return (
    <AdminShell active="produtos" tabs={PRODUCTS_TABS}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link to="/produtos" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <BackIcon className="h-3 w-3" /> Voltar para produtos
            </Link>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-1 text-gold">Cadastro rápido com IA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Envie as fotos, a IA identifica cores, marca e preenche os dados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Photos */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">1. Fotos do produto ({images.length}/8)</p>
                {images.length > 0 && (
                   <button onClick={() => setImages([])} className="text-[10px] text-red-500 hover:underline">Limpar todas</button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative aspect-[3/4] rounded-lg border border-border overflow-hidden group">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {images.length < 8 && (
                  <label className="aspect-[3/4] border border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <AddIcon className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-[10px] text-muted-foreground">Adicionar</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFiles(e.target.files)} 
                    />
                  </label>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                  <CamIcon className="h-4 w-4" />
                  Câmera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
                <button
                  onClick={handleAnalyze}
                  disabled={images.length === 0 || analyzing}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-gold text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {analyzing ? <Spinner className="h-4 w-4 animate-spin" /> : <AIAcon className="h-4 w-4" />}
                  {analyzing ? "Analisando..." : analyzed ? "Reanalisar" : "Detectar com IA"}
                </button>
              </div>
            </div>

            {/* Price & Stock */}
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">2. Preço e Estoque Base</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço (R$)" value={price} onChange={setPrice} placeholder="0,00" />
                <Field label="Preço Promo (Opcional)" value={salePrice} onChange={setSalePrice} placeholder="0,00" />
              </div>
              <div className="mt-3">
                <Field label="Estoque por Cor/Tamanho" value={stockPerVariant} onChange={setStockPerVariant} type="number" />
              </div>
            </div>
          </div>

          {/* Right: AI Results & Confirmation */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-background p-5 min-h-[400px]">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">3. Revisão dos dados</p>

              {!analyzed ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-sm text-muted-foreground p-8 border border-dashed border-border rounded-xl">
                  <AIAcon className="h-8 w-8 mb-3 opacity-20" />
                  <p>Aguardando análise da IA...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-gold/5 border border-gold/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gold uppercase font-bold">Marca Detectada</p>
                      <p className="text-sm font-medium">{analyzed.brand || "Não identificada"}</p>
                    </div>
                    {analyzed.brands.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end max-w-[50%]">
                        {analyzed.brands.map(b => (
                          <button 
                            key={b} 
                            onClick={() => setBrand(b)}
                            className={`text-[9px] px-1.5 py-0.5 rounded border ${brand === b ? 'bg-gold text-white border-gold' : 'border-border'}`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Field label="Nome do Produto" value={analyzed.name} onChange={(v) => setAnalyzed({...analyzed, name: v})} />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField
                      label="Categoria"
                      value={analyzed.category_id}
                      onChange={(v) => setAnalyzed({...analyzed, category_id: v as any})}
                      options={[{ v: "feminino", l: "Feminino" }, { v: "masculino", l: "Masculino" }]}
                    />
                    <div className="space-y-1.5">
                      <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">Modo de Tamanho</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setSizeMode("unico")}
                          className={`flex-1 text-[10px] py-2 rounded border transition-colors ${sizeMode === "unico" ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
                        >
                          Único
                        </button>
                        <button 
                          onClick={() => setSizeMode("multi")}
                          className={`flex-1 text-[10px] py-2 rounded border transition-colors ${sizeMode === "multi" ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
                        >
                          Vários
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Variações Detectadas ({groupedVariants.length})</p>
                    <div className="space-y-2">
                      {groupedVariants.map((group, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30">
                          <div className="h-10 w-8 rounded overflow-hidden bg-muted relative">
                            {images[group.image_index] ? (
                              <img src={images[group.image_index].preview} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImgIcon className="h-full w-full p-2 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: group.color_hex || '#ccc' }} />
                              <span className="text-xs font-medium truncate">{group.color}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {group.variants.map(v => (
                                <span key={v.id} className="text-[9px] px-1 bg-background border border-border rounded">{v.size}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground text-background px-4 py-3 text-sm font-semibold disabled:opacity-50 mt-4"
                  >
                    {saving ? <Spinner className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                    {saving ? (uploadProgress || "Cadastrando...") : "Confirmar e Criar Produto"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );
}
