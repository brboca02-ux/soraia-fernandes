import { Link } from "@tanstack/react-router";
import { Loader2, ImageOff } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { buildSrcSet, CARD_SIZES, BLUR_PLACEHOLDER } from "@/lib/image";
import { track } from "@/lib/analytics";



export function ProductCard({ product, size = "default" }: { product: ShopifyProduct; size?: "default" | "compact" }) {
  const addItem = useCartStore((s) => s.addItem);
  const [isAdding, setIsAdding] = useState(false);
  const [loaded0, setLoaded0] = useState(false);
  const [loaded1, setLoaded1] = useState(false);
  const allVariants = product.node.variants.edges.map((e) => e.node);
  // Escolhe a primeira variante COM estoque disponível (não apenas a primeira da lista),
  // pra evitar marcar como "Esgotado" quando só o PP zerou mas M/G têm estoque.
  const variant =
    allVariants.find((v) => v.availableForSale && (v.quantityAvailable ?? 1) > 0) ??
    allVariants[0];

  const img0 = product.node.images.edges[0]?.node;
  const img1 = product.node.images.edges[1]?.node ?? img0;
  const price = product.node.priceRange.minVariantPrice;
  const soldOut =
    allVariants.length > 0 &&
    allVariants.every(
      (v) => !v.availableForSale || (typeof v.quantityAvailable === "number" && v.quantityAvailable <= 0),
    );
  const totalAvailable = allVariants.reduce(
    (sum, v) => sum + (typeof v.quantityAvailable === "number" ? Math.max(0, v.quantityAvailable) : 0),
    0,
  );
  const lowStock = !soldOut && totalAvailable > 0 && totalAvailable <= 3;

  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!variant || soldOut || isAdding) return;
    setIsAdding(true);
    try {
      await addItem({
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity: 1,
        selectedOptions: variant.selectedOptions ?? [],
      });
      track.addToCart({
        id: product.node.id,
        name: product.node.title,
        price: parseFloat(variant.price.amount),
        currency: variant.price.currencyCode,
      });
    } finally {
      setIsAdding(false);
    }
  };



  return (
    <Link
      to="/produto/$handle"
      params={{ handle: product.node.handle }}
      aria-label={`Ver detalhes de ${product.node.title}`}
      className="group flex h-full w-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-secondary border border-gold/5">
        {img0 ? (
          <>
            {!loaded0 && (
              <img
                src={BLUR_PLACEHOLDER}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
              />
            )}
            <img
              src={img0.url}
              srcSet={buildSrcSet(img0.url)}
              sizes={CARD_SIZES}
              alt={img0.altText ?? product.node.title}
              loading="lazy"
              decoding="async"
              width={600}
              height={800}
              onLoad={() => setLoaded0(true)}
              className={`absolute inset-0 w-full h-full object-contain object-top transition-all duration-700 group-hover:opacity-0 ${loaded0 ? "opacity-100" : "opacity-0"}`}
            />
            {img1 && (
              <img
                src={img1.url}
                srcSet={buildSrcSet(img1.url)}
                sizes={CARD_SIZES}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                width={600}
                height={800}
                onLoad={() => setLoaded1(true)}
                className={`absolute inset-0 w-full h-full object-contain object-top scale-105 transition-transform duration-[1200ms] ease-out group-hover:scale-100 ${loaded1 ? "opacity-100" : "opacity-0"}`}
              />
            )}
          </>

        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8 mb-2" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}

        {soldOut && (
          <span className="absolute top-2 left-2 bg-foreground text-background text-[10px] font-semibold tracking-widest uppercase px-2 py-1 rounded">
            Esgotado
          </span>
        )}
        {!soldOut && lowStock && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-semibold tracking-widest uppercase px-2 py-1 rounded">
            Últimas peças
          </span>
        )}

        <button
          onClick={onAdd}
          disabled={isAdding || !variant || soldOut}
          aria-label={soldOut ? "Produto esgotado" : `Comprar ${product.node.title}`}
          className="absolute bottom-0 inset-x-0 bg-foreground text-background text-[11px] tracking-[0.25em] uppercase py-3 translate-y-full group-hover:translate-y-0 focus-visible:translate-y-0 transition-transform duration-500 flex items-center justify-center disabled:opacity-60"
        >
          {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : soldOut ? "Esgotado" : "Comprar"}
        </button>
      </div>
      <div className={`flex flex-1 flex-col text-center ${size === "compact" ? "pt-2" : "pt-3"}`}>
        <h3 className={`font-display leading-snug line-clamp-2 overflow-hidden text-ellipsis ${size === "compact" ? "text-[10px] md:text-[11px] min-h-[2.4em]" : "text-[11px] sm:text-[13px] md:text-sm min-h-[2.6em]"}`}>
          {product.node.title}
        </h3>
        <p className={`${size === "compact" ? "text-[10px] md:text-xs pt-1" : "text-[11px] sm:text-xs md:text-sm pt-2"} mt-auto font-semibold text-foreground`}>
          {formatPrice(price.amount, price.currencyCode)}
        </p>
      </div>
    </Link>
  );
}
