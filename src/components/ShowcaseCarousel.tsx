import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useProductsStore } from "@/stores/productsStore";
import { productToShopify } from "@/lib/mockProducts";
import { ProductCard } from "./ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ShowcaseCarousel() {
  const products = useProductsStore((s) => s.products);
  const loaded = useProductsStore((s) => s.loaded);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const showcaseProducts = useMemo(() => {
    return products
      .filter((p) => p.status === "ativo" && p.showcase)
      .map(productToShopify);
  }, [products]);

  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const itemWidth = clientWidth / 2.5; // Aproximadamente o tamanho de um card compacto
    const scrollTo = direction === "left" ? scrollLeft - itemWidth : scrollLeft + itemWidth;
    
    scrollRef.current.scrollTo({
      left: scrollTo,
      behavior: "smooth",
    });
  }, []);

  // Autoplay logic
  useEffect(() => {
    if (isPaused || showcaseProducts.length <= 2) return;
    
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      
      // Se chegou no fim, volta pro começo de forma suave
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scroll("right");
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused, showcaseProducts.length, scroll]);

  if (!loaded || showcaseProducts.length === 0) return null;

  return (
    <section className="py-6 md:py-10 bg-background border-b border-border overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground mb-1">Destaques</p>
            <h2 className="font-display font-semibold text-2xl tracking-tight">Vitrine J&S</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="tap-target rounded-full border border-border hover:bg-muted transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="tap-target rounded-full border border-border hover:bg-muted transition-colors"
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          className="flex gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-4"
        >
          {showcaseProducts.map((p) => (
            <div key={p.node.id} className="shrink-0 w-[120px] sm:w-[140px] md:w-[160px] snap-start">
              <ProductCard product={p} size="compact" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


