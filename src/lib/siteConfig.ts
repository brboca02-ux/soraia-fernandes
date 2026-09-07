import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteConfig {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  promoTitle: string;
  promoSubtitle: string;
  promoCoupon: string;
  promoCouponPercent: number;
  newsletterTitle: string;
  newsletterSubtitle: string;
  whatsappCtaTitle: string;
  whatsappCtaSubtitle: string;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  heroEyebrow: "Nova Coleção",
  heroTitle: "Soraia Fernandes",
  heroSubtitle: "Vestidos de festa e moda feminina para todas as ocasiões.",
  heroCta: "Comprar Agora",
  promoTitle: "Ofertas da Semana",
  promoSubtitle: "Aproveite descontos exclusivos até domingo",
  promoCoupon: "BEMVINDA5",
  promoCouponPercent: 5,
  newsletterTitle: "Lançamentos em primeira mão",
  newsletterSubtitle: "Receba novidades, lançamentos e tendências da Soraia Fernandes direto no seu e-mail.",
  whatsappCtaTitle: "Precisa de ajuda para escolher?",
  whatsappCtaSubtitle: "Fale com uma consultora Soraia Fernandes pelo WhatsApp.",
};

const STORAGE_KEY = "md_site_config_v1";
const CONFIG_KEY = "home";

export async function loadSiteConfig(): Promise<SiteConfig> {
  // Fonte de verdade: tabela `site_config` (leitura pública). O localStorage
  // fica apenas como cache para a primeira pintura da home.
  const { data, error } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  if (!error && data?.value) {
    const cfg = { ...DEFAULT_SITE_CONFIG, ...(data.value as Partial<SiteConfig>) };
    if (typeof window !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* cache opcional */ }
    }
    return cfg;
  }

  if (typeof window === "undefined") return DEFAULT_SITE_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_CONFIG;
    return { ...DEFAULT_SITE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

export async function saveSiteConfig(cfg: SiteConfig) {
  const { error } = await supabase
    .from("site_config")
    .upsert(
      { key: CONFIG_KEY, value: JSON.parse(JSON.stringify(cfg)) },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);

  if (typeof window !== "undefined") {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* cache opcional */ }
    window.dispatchEvent(new CustomEvent("md:site-config"));
  }
}

export function useSiteConfig(): SiteConfig {
  const [cfg, setCfg] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  useEffect(() => {
    loadSiteConfig().then(setCfg);
    const handler = () => loadSiteConfig().then(setCfg);
    window.addEventListener("md:site-config", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("md:site-config", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return cfg;
}
