// Imagens editáveis do site (cards de categorias e vitrine).
// Admin faz upload pelo painel; a home lê os valores salvos no banco.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteMediaKey = "cat_feminino" | "cat_masculino" | "vitrine_capa";

export type SiteMediaMap = Partial<Record<SiteMediaKey, string>>;

export async function loadSiteMedia(): Promise<SiteMediaMap> {
  const { data, error } = await supabase.from("site_media").select("key, url");
  if (error || !data) return {};
  const out: SiteMediaMap = {};
  for (const r of data as { key: string; url: string }[]) {
    out[r.key as SiteMediaKey] = r.url;
  }
  return out;
}

export async function saveSiteMedia(key: SiteMediaKey, url: string): Promise<void> {
  const { error } = await supabase
    .from("site_media")
    .upsert({ key, url, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

export async function clearSiteMedia(key: SiteMediaKey): Promise<void> {
  const { error } = await supabase.from("site_media").delete().eq("key", key);
  if (error) throw error;
}

// Upload otimizado: reduz, comprime e converte para WebP antes de subir.
export async function uploadSiteImage(
  file: File,
  opts: { aspect?: number; maxWidth?: number } = {},
): Promise<string> {
  const { normalizeProductImage } = await import("@/lib/imageProcessing");
  const processed = await normalizeProductImage(file, {
    aspect: opts.aspect ?? 16 / 9,
    maxWidth: opts.maxWidth ?? 900,
    quality: 0.78,
    mime: "image/webp",
  }).catch(() => file);
  const ext = processed.name.split(".").pop() ?? "webp";
  const path = `site/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, processed, {
    cacheControl: "31536000", upsert: false, contentType: processed.type,
  });
  if (error) throw error;
  return `/api/public/img/${path}`;
}

export function useSiteMedia(): SiteMediaMap {
  const [media, setMedia] = useState<SiteMediaMap>({});
  useEffect(() => {
    let alive = true;
    loadSiteMedia().then((m) => { if (alive) setMedia(m); });
    return () => { alive = false; };
  }, []);
  return media;
}
