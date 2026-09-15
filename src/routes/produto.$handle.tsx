import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import { formatPrice, STORE_INFO, buildWhatsAppLink } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useProductsStore } from "@/stores/productsStore";
import { productToShopify } from "@/lib/mockProducts";
import { Loader2, ShieldCheck, Truck, RefreshCcw, MapPin, MessageCircle, Flame, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { buildSrcSet, PDP_SIZES, BLUR_PLACEHOLDER } from "@/lib/image";
import { RelatedProducts } from "@/components/RelatedProducts";

export const Route = createFileRoute("/produto/$handle")({
  head: ({ params }) => {
    const desc = `Compre ${params.handle} na Soraia Fernandes: vestidos de festa e moda feminina, envio para todo o Brasil e atendimento pelo WhatsApp.`;
    return {
      meta: [
        { title: `${params.handle} — Soraia Fernandes` },
        { name: "description", content: desc },
        { property: "og:title", content: `${params.handle} — Soraia Fernandes` },
        { property: "og:description", content: desc },
        { name: "twitter:description", content: desc },
        { property: "og:url", content: `https://www.soraiafernandes.com.br/produto/${params.handle}` },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: `https://www.soraiafernandes.com.br/produto/${params.handle}` }],
    };
  },
  component: ProductPage,
});

// Mapa de cor -> hex para renderizar as amostras (swatches) compactas.
const COLOR_HEX: Record<string, string> = {
  preto: "#111111", branco: "#fafafa", "off-white": "#f2ebde", offwhite: "#f2ebde",
  cinza: "#8c8c8c", "cinza claro": "#c4c4c4", "cinza escuro": "#4a4a4a", grafite: "#3a3a3a",
  marrom: "#5b3a1e", chocolate: "#4a2b13", caramelo: "#a2703c", bege: "#d9c6a5", nude: "#e6c6ae",
  azul: "#1e3a8a", "azul claro": "#7cb2e8", "azul marinho": "#0d1b3d", "azul turquesa": "#30b5b0",
  turquesa: "#30b5b0", verde: "#3f6b3a", "verde militar": "#4b5320", "verde oliva": "#6b7d3a",
  vermelho: "#a11d1d", vinho: "#5a1a24", rosa: "#e5a1b6", "rosa claro": "#f6cfd8",
  pink: "#e21f7a", amarelo: "#e8c547", mostarda: "#c9971a", roxo: "#5b3a7a", lilas: "#b39ddb", lilás: "#b39ddb",
  laranja: "#d97706", terracota: "#b5522f", palha: "#e8d59a",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function colorSwatch(name: string, override?: string | null): string {
  if (override && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(override)) return override;
  const n = norm(name);
  return COLOR_HEX[n] ?? COLOR_HEX[n.split(" ")[0]] ?? "#cfcfcf";
}

function ProductPage() {
  const { handle } = Route.useParams();
  const products = useProductsStore((s) => s.products);
  const loaded = useProductsStore((s) => s.loaded);
  const loading = useProductsStore((s) => s.loading);

  const product = useMemo(() => products.find((p) => p.slug === handle), [products, handle]);
  const data = useMemo(() => (product ? productToShopify(product).node : null), [product]);

  const addItem = useCartStore((s) => s.addItem);
  const [isAdding, setIsAdding] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const variants = useMemo(() => data?.variants.edges.map((e) => e.node) ?? [], [data]);
  const allImages = useMemo(() => data?.images.edges.map((e) => e.node) ?? [], [data]);

  const colors = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => v.selectedOptions.find((o) => o.name === "Cor")?.value && set.add(v.selectedOptions.find((o) => o.name === "Cor")!.value));
    return [...set];
  }, [variants]);

  const colorHexMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    variants.forEach((v) => {
      const c = v.selectedOptions.find((o) => o.name === "Cor")?.value;
      if (c && v.colorHex && !map[c]) map[c] = v.colorHex;
    });
    return map;
  }, [variants]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => {
      const s = v.selectedOptions.find((o) => o.name === "Tamanho")?.value;
      if (s) set.add(s);
    });
    const result = [...set];
    // Se só existe "Único", não mostramos o seletor
    if (result.length === 1 && result[0] === "Único") return [];
    return result;
  }, [variants]);

  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);

  // Inicializa seleção com a primeira variante disponível
  useEffect(() => {
    if (!variants.length) return;
    const first = variants.find((v) => v.availableForSale) ?? variants[0];
    setColor(first.selectedOptions.find((o) => o.name === "Cor")?.value ?? null);
    setSize(first.selectedOptions.find((o) => o.name === "Tamanho")?.value ?? null);
  }, [data?.id]); // eslint-disable-line

  const selected = useMemo(() => {
    return (
      variants.find(
        (v) =>
          (!color || v.selectedOptions.find((o) => o.name === "Cor")?.value === color) &&
          (!size || v.selectedOptions.find((o) => o.name === "Tamanho")?.value === size),
      ) ?? null
    );
  }, [variants, color, size]);

  // Tamanhos disponíveis para a cor escolhida
  const sizeAvailability = useMemo(() => {
    const map: Record<string, boolean> = {};
    sizes.forEach((s) => {
      const v = variants.find(
        (vv) =>
          vv.selectedOptions.find((o) => o.name === "Tamanho")?.value === s &&
          (!color || vv.selectedOptions.find((o) => o.name === "Cor")?.value === color),
      );
      map[s] = !!v?.availableForSale;
    });
    return map;
  }, [variants, sizes, color]);

  const colorAvailability = useMemo(() => {
    const map: Record<string, boolean> = {};
    colors.forEach((c) => {
      const v = variants.find(
        (vv) => vv.selectedOptions.find((o) => o.name === "Cor")?.value === c && vv.availableForSale,
      );
      map[c] = !!v;
    });
    return map;
  }, [variants, colors]);

  // Filtra imagens pela cor selecionada (via altText / url); se não houver match, mostra todas.
  const images = useMemo(() => {
    if (!color || allImages.length <= 1) return allImages;
    const key = norm(color);
    const filtered = allImages.filter(
      (i) => norm(i.altText ?? "").includes(key) || norm(i.url).includes(key.replace(/\s+/g, "-")),
    );
    return filtered.length ? filtered : allImages;
  }, [allImages, color]);

  useEffect(() => {
    if (data && selected) {
      track.viewItem({
        id: data.id, name: data.title,
        price: parseFloat(selected.price.amount),
        currency: selected.price.currencyCode,
      });
    }
  }, [data?.id, selected?.id]); // eslint-disable-line

  // Pré-carrega as próximas imagens da galeria (após a atual) assim que a página abre,
  // para que o swipe/setas mostrem a foto instantaneamente.
  useEffect(() => {
    if (typeof window === "undefined" || images.length <= 1) return;
    const timers: number[] = [];
    images.forEach((img, i) => {
      if (i === 0) return; // a primeira já vem eager
      const t = window.setTimeout(() => {
        const el = new window.Image();
        el.decoding = "async";
        el.srcset = buildSrcSet(img.url, [480, 800, 1200]);
        el.sizes = PDP_SIZES;
        el.src = img.url;
      }, i * 120); // pequeno stagger p/ não brigar com o LCP
      timers.push(t);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [images]);


  if (loading || (!loaded && !product)) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  if (loaded && !product) throw notFound();
  if (!data) return null;

  const soldOut = !selected?.availableForSale;
  const lowStock =
    typeof selected?.quantityAvailable === "number" &&
    selected.quantityAvailable > 0 &&
    selected.quantityAvailable <= 3;

  const handleAdd = async () => {
    if (!selected || soldOut || isAdding) return;
    setIsAdding(true);
    try {
      await addItem({
        product: { node: { ...data } } as never,
        variantId: selected.id,
        variantTitle: selected.title,
        price: selected.price,
        quantity: 1,
        selectedOptions: selected.selectedOptions,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const productUrl = typeof window !== "undefined" ? window.location.href : `/produto/${handle}`;
  const optionsText = selected?.selectedOptions?.length
    ? selected.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(", ") : "";
  const priceText = selected ? formatPrice(selected.price.amount, selected.price.currencyCode) : "";
  const waMessage = [
    `Olá! Tenho interesse no produto *${data.title}*`,
    optionsText && `(${optionsText})`,
    priceText && `— ${priceText}.`,
    `Poderia me ajudar?`,
    productUrl,
  ].filter(Boolean).join(" ");
  const waLink = buildWhatsAppLink(waMessage);

  const canonicalUrl = `https://www.soraiafernandes.com.br/produto/${handle}`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.title,
    description: data.description,
    image: allImages.map((i) => i.url),
    sku: selected?.id,
    brand: { "@type": "Brand", name: "Soraia Fernandes" },
    url: canonicalUrl,
    offers: {
      "@type": "Offer",
      priceCurrency: selected?.price.currencyCode ?? "BRL",
      price: selected?.price.amount,
      itemCondition: "https://schema.org/NewCondition",
      availability: selected?.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: canonicalUrl,
      seller: { "@type": "Organization", name: "Soraia Fernandes", "@id": "https://www.soraiafernandes.com.br/#organization" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: "https://www.soraiafernandes.com.br/" },
      { "@type": "ListItem", position: 2, name: "Coleção", item: "https://www.soraiafernandes.com.br/colecao" },
      { "@type": "ListItem", position: 3, name: data.title, item: canonicalUrl },
    ],
  };

  return (
    <div className="bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <nav aria-label="breadcrumb" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-4 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/" className="hover:text-foreground transition">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/colecao" search={{}} className="hover:text-foreground transition">Coleção</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground truncate max-w-[60vw]" aria-current="page">{data.title}</li>
        </ol>
      </nav>
      <div className="max-w-[1400px] mx-auto w-full overflow-x-hidden px-4 sm:px-6 lg:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="relative -mx-4 sm:mx-0 min-w-0 group/carousel lg:col-start-1 lg:row-start-1">
          <div
            ref={scrollerRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const w = el.clientWidth;
              if (w > 0) setCarouselIdx(Math.round(el.scrollLeft / w));
            }}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((img, i) => {
              // Carrega a atual, a anterior e a próxima imediatamente; demais entram como lazy.
              const near = Math.abs(i - carouselIdx) <= 1;
              return (
                <button
                  type="button"
                  key={`${color ?? "x"}-${i}`}
                  onClick={() => setLightboxIdx(i)}
                  aria-label={`Ampliar imagem ${i + 1}`}
                  className="relative bg-secondary overflow-hidden rounded-md aspect-[4/5] shrink-0 w-full snap-center"
                >
                  {/* Placeholder blur: mini versão (32px) ampliada + blur, removido no onLoad */}
                  <img
                    aria-hidden="true"
                    src={`${img.url}${img.url.includes("?") ? "&" : "?"}width=32`}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl transition-opacity duration-500"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[linear-gradient(110deg,hsl(var(--muted))_8%,hsl(var(--secondary))_18%,hsl(var(--muted))_33%)] bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite] opacity-40"
                  />
                  <img
                    src={img.url}
                    srcSet={buildSrcSet(img.url, [480, 800, 1200, 1600])}
                    sizes={PDP_SIZES}
                    alt={img.altText ?? data.title}
                    loading={i === 0 || near ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                    fetchPriority={i === carouselIdx ? "high" : "auto"}
                    style={{ backgroundImage: `url('${BLUR_PLACEHOLDER}')`, backgroundSize: "cover" }}
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      // remove skeleton + blur placeholder ao carregar a imagem final
                      let prev = el.previousSibling as HTMLElement | null;
                      while (prev) {
                        const next = prev.previousSibling as HTMLElement | null;
                        prev.style.opacity = "0";
                        setTimeout(() => prev?.remove(), 400);
                        prev = next;
                      }
                    }}
                    className="relative w-full h-full object-cover select-none"
                  />

                </button>
              );
            })}
          </div>


          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Imagem anterior"
                onClick={() => {
                  const el = scrollerRef.current;
                  if (!el) return;
                  el.scrollTo({ left: Math.max(0, (carouselIdx - 1)) * el.clientWidth, behavior: "smooth" });
                }}
                disabled={carouselIdx === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/85 hover:bg-white text-foreground shadow-md flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Próxima imagem"
                onClick={() => {
                  const el = scrollerRef.current;
                  if (!el) return;
                  el.scrollTo({ left: Math.min(images.length - 1, carouselIdx + 1) * el.clientWidth, behavior: "smooth" });
                }}
                disabled={carouselIdx >= images.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/85 hover:bg-white text-foreground shadow-md flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-3 right-3 flex gap-1 px-2 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ir para imagem ${i + 1}`}
                    onClick={() => {
                      const el = scrollerRef.current;
                      if (!el) return;
                      el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
                    }}
                    className={`h-1 rounded-full transition-all ${i === carouselIdx ? "w-6 bg-white" : "w-2 bg-white/60"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="lg:col-start-1 lg:row-start-2 -mt-4 lg:-mt-6 px-4 sm:px-0">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((img, i) => {
                const active = i === carouselIdx;
                return (
                  <button
                    key={`thumb-${color ?? "x"}-${i}`}
                    type="button"
                    aria-label={`Ver imagem ${i + 1}`}
                    aria-current={active}
                    onClick={() => {
                      const el = scrollerRef.current;
                      if (!el) return;
                      el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
                    }}
                    className={`relative shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-md overflow-hidden bg-secondary border-2 transition ${active ? "border-primary ring-1 ring-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img
                      src={img.url}
                      srcSet={buildSrcSet(img.url, [120, 200])}
                      sizes="80px"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}





        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-32 lg:self-start">
          <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">Soraia Fernandes</span>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl mt-3">{data.title}</h1>
          <div className="mt-4">
            <p className="text-3xl font-bold text-primary">
              {selected ? formatPrice(selected.price.amount, selected.price.currencyCode) : "—"}
            </p>
            {selected && (
              <p className="text-sm text-muted-foreground mt-1">
                ou 4x de {formatPrice(parseFloat(selected.price.amount) / 4, selected.price.currencyCode)} sem juros · <span className="text-gold font-semibold">10% off no Pix</span>
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {soldOut ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                  Indisponível
                </span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  <Flame className="h-3.5 w-3.5" /> Últimas {selected!.quantityAvailable} peças
                </span>
              ) : (
                selected && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 px-2.5 py-1 rounded-full">
                    Em estoque{typeof selected.quantityAvailable === "number" ? ` · ${selected.quantityAvailable}` : ""}
                  </span>
                )
              )}
            </div>
          </div>

          {colors.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cor: <span className="text-foreground normal-case tracking-normal">{color ?? "—"}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {colors.map((c) => {
                  const active = c === color;
                  const avail = colorAvailability[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      title={c}
                      aria-label={`Cor ${c}`}
                      aria-pressed={active}
                      className={`relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border transition ${active ? "ring-2 ring-primary ring-offset-2 border-primary" : "border-border hover:border-foreground/50"} ${!avail ? "opacity-40" : ""}`}
                      style={{ backgroundColor: colorSwatch(c, colorHexMap[c]) }}
                    >
                      {active && (
                        <Check className="h-4 w-4 absolute inset-0 m-auto text-white mix-blend-difference" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tamanho: <span className="text-foreground normal-case tracking-normal">{size ?? "—"}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sizes.map((s) => {
                  const active = s === size;
                  const avail = sizeAvailability[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      disabled={!avail}
                      aria-pressed={active}
                      className={`min-w-10 sm:min-w-12 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-md border transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground/60"} ${!avail ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2.5 w-full">
            <Button onClick={handleAdd} disabled={isAdding || soldOut || !selected} size="xl" className="w-full min-w-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-sm sm:text-base whitespace-normal">
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : soldOut ? "Indisponível" : "🛒 Adicionar à Sacola"}
            </Button>
            <Button asChild size="xl" className="w-full min-w-0 rounded-full bg-[#25D366] hover:bg-[#25D366]/90 text-white h-14 text-sm sm:text-base whitespace-normal">
              <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => track.whatsappClick("product")} className="flex items-center justify-center gap-2 px-3">
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span className="truncate">Comprar pelo WhatsApp</span>
              </a>
            </Button>
          </div>

          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Loja física em {STORE_INFO.city}</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Atendimento pelo WhatsApp</li>
            <li className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 text-primary" /> Troca facilitada</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Compra segura</li>
          </ul>

          <p className="mt-5 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{data.description}</p>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-border text-center">
            <div><Truck className="mx-auto h-5 w-5 text-primary" /><p className="text-xs mt-2">Entrega na região</p></div>
            <div><RefreshCcw className="mx-auto h-5 w-5 text-primary" /><p className="text-xs mt-2">Troca fácil</p></div>
            <div><ShieldCheck className="mx-auto h-5 w-5 text-primary" /><p className="text-xs mt-2">Site seguro</p></div>
          </div>
        </div>
      </div>

      {product && <RelatedProducts currentProduct={product} />}


      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            aria-label="Fechar"
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
          >
            <X className="h-6 w-6" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + images.length) % images.length); }}
                aria-label="Anterior"
                className="absolute left-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % images.length); }}
                aria-label="Próxima"
                className="absolute right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={images[lightboxIdx].url}
            srcSet={buildSrcSet(images[lightboxIdx].url, [800, 1200, 1600, 1920])}
            sizes="90vw"
            alt={images[lightboxIdx].altText ?? data.title}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
