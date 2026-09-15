// Utilitário responsivo de imagens.
// Shopify CDN aceita `?width=` (e mantém proporção). Supabase Storage
// aceita `?width=` quando image-transformations está ativo; caso contrário
// devolve original — safe fallback.

function withWidth(url: string, w: number): string {
  if (!url) return url;
  try {
    const u = new URL(url, "https://x");
    // Shopify: /files/xxx.jpg → /files/xxx.jpg?width=W
    // Supabase: /storage/v1/object/public/... → ?width=W (ignorado se sem plano)
    u.searchParams.set("width", String(w));
    return u.pathname.startsWith("/") && !url.startsWith("http")
      ? `${u.pathname}${u.search}`
      : u.toString().replace("https://x", "");
  } catch {
    return url;
  }
}

export function buildSrcSet(url: string, widths: number[] = [320, 480, 640, 800, 1200]): string {
  return widths.map((w) => `${withWidth(url, w)} ${w}w`).join(", ");
}

export const CARD_SIZES = "(min-width: 1536px) 16vw, (min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw";
export const PDP_SIZES = "(min-width: 1024px) 50vw, 100vw";

// Placeholder SVG blurry inline (tiny, ~1KB). Cor neutra da marca.
export const BLUR_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><rect width='4' height='5' fill='#eeeae4'/></svg>`,
  );
