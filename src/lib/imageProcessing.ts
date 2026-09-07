// Client-side image normalizer.
// Pads any image to a fixed aspect ratio (default 3:4) with a clean background
// so the product card can use object-cover with ZERO cropping of the garment.
// Also resizes to a max width and re-encodes as WebP to reduce file size.

export interface NormalizeOptions {
  aspect?: number;        // width / height (default 3/4 = 0.75)
  maxWidth?: number;      // px (default 1200)
  background?: string;    // CSS color (default detected from corners, fallback #ffffff)
  quality?: number;       // 0..1 (default 0.85)
  mime?: "image/webp" | "image/jpeg"; // default webp
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

function detectBackground(img: HTMLImageElement): string {
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "#ffffff";
    ctx.drawImage(img, 0, 0);
    const pts = [
      [1, 1], [c.width - 2, 1], [1, c.height - 2], [c.width - 2, c.height - 2],
    ];
    let r = 0, g = 0, b = 0;
    for (const [x, y] of pts) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      r += d[0]; g += d[1]; b += d[2];
    }
    r = Math.round(r / pts.length);
    g = Math.round(g / pts.length);
    b = Math.round(b / pts.length);
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return "#ffffff";
  }
}

export async function normalizeProductImage(
  file: File,
  opts: NormalizeOptions = {},
): Promise<File> {
  // Skip SVGs / animated GIFs (we don't want to flatten frames).
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

  const aspect = opts.aspect ?? 3 / 4;
  const maxWidth = opts.maxWidth ?? 1200;
  const quality = opts.quality ?? 0.85;
  const mime = opts.mime ?? "image/webp";

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file; // fallback: upload original
  }

  const targetW = Math.min(maxWidth, Math.max(img.naturalWidth, 600));
  const targetH = Math.round(targetW / aspect);

  // Fit the image inside the canvas without cropping (object-contain style).
  const srcRatio = img.naturalWidth / img.naturalHeight;
  let drawW: number, drawH: number;
  if (srcRatio > aspect) {
    drawW = targetW;
    drawH = Math.round(targetW / srcRatio);
  } else {
    drawH = targetH;
    drawW = Math.round(targetH * srcRatio);
  }
  const dx = Math.round((targetW - drawW) / 2);
  const dy = Math.round((targetH - drawH) / 2);

  const bg = opts.background ?? detectBackground(img);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, drawW, drawH);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), mime, quality),
  );
  if (!blob) return file;

  const ext = mime === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.${ext}`, { type: mime });
}
