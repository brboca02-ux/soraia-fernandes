import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { HomeMediaSettings } from "@/components/admin/HomeMediaSettings";
import {
  DEFAULT_SITE_CONFIG,
  loadSiteConfig,
  saveSiteConfig,
  type SiteConfig,
} from "@/lib/siteConfig";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Configurações — Soraia Fernandes" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPanel,
});

function Field({
  label,
  value,
  onChange,
  textarea,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </label>
  );
}

function AdminPanel() {
  const [cfg, setCfg] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

  useEffect(() => {
    loadSiteConfig().then(setCfg);
  }, []);

  const update = <K extends keyof SiteConfig>(k: K, v: SiteConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

  const save = async () => {
    try {
      await saveSiteConfig(cfg);
      toast.success("Conteúdo atualizado em todo o site.");
    } catch (e) {
      toast.error("Erro ao salvar configurações.");
    }
  };

  const reset = async () => {
    try {
      await saveSiteConfig(DEFAULT_SITE_CONFIG);
      setCfg(DEFAULT_SITE_CONFIG);
      toast.success("Conteúdo restaurado para o padrão.");
    } catch (e) {
      toast.error("Erro ao restaurar padrão.");
    }
  };

  return (
    <AdminShell active="configuracoes">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl">Painel Soraia Fernandes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edite banners, promoções e textos da home sem alterar código. As mudanças são salvas no banco e valem em qualquer dispositivo.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl">Hero / Banner principal</h2>
        <Field label="Etiqueta" value={cfg.heroEyebrow} onChange={(v) => update("heroEyebrow", v)} />
        <Field label="Título" value={cfg.heroTitle} onChange={(v) => update("heroTitle", v)} />
        <Field label="Subtítulo" value={cfg.heroSubtitle} onChange={(v) => update("heroSubtitle", v)} textarea />
        <Field label="Texto do botão" value={cfg.heroCta} onChange={(v) => update("heroCta", v)} />
      </section>

      <section className="space-y-4 mt-10">
        <h2 className="font-display text-xl">Promoção da semana</h2>
        <Field label="Título" value={cfg.promoTitle} onChange={(v) => update("promoTitle", v)} />
        <Field label="Subtítulo" value={cfg.promoSubtitle} onChange={(v) => update("promoSubtitle", v)} />
        <Field label="Código do cupom" value={cfg.promoCoupon} onChange={(v) => update("promoCoupon", v.toUpperCase())} />
        <Field
          label="Desconto (%)"
          type="number"
          value={cfg.promoCouponPercent}
          onChange={(v) => update("promoCouponPercent", Number(v) || 0)}
        />
      </section>

      <section className="space-y-4 mt-10">
        <h2 className="font-display text-xl">Newsletter</h2>
        <Field label="Título" value={cfg.newsletterTitle} onChange={(v) => update("newsletterTitle", v)} />
        <Field label="Subtítulo" value={cfg.newsletterSubtitle} onChange={(v) => update("newsletterSubtitle", v)} textarea />
      </section>

      <section className="space-y-4 mt-10">
        <h2 className="font-display text-xl">CTA WhatsApp</h2>
        <Field label="Título" value={cfg.whatsappCtaTitle} onChange={(v) => update("whatsappCtaTitle", v)} />
        <Field label="Subtítulo" value={cfg.whatsappCtaSubtitle} onChange={(v) => update("whatsappCtaSubtitle", v)} />
      </section>

      <HomeMediaSettings />

      <div className="flex flex-wrap gap-3 mt-10">
        <button onClick={save} className="bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-semibold">
          Salvar alterações
        </button>
        <button onClick={reset} className="border border-border rounded-md px-5 py-2.5 text-sm">
          Restaurar padrão
        </button>
      </div>

    </div>
    </AdminShell>
  );
}
