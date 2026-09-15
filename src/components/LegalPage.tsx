import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/shopify";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  updatedAt?: string;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

export function LegalPage({ eyebrow, title, updatedAt = "Junho de 2026", breadcrumbs, children }: LegalPageProps) {
  const wa = buildWhatsAppLink(`Olá Soraia Fernandes, vim pela página ${title} e gostaria de ajuda.`);
  return (
    <div className="bg-background">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <section className="bg-background border-b border-border py-14">
        <div className="max-w-[860px] mx-auto px-6">
          <span className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground">{eyebrow}</span>
          <h1 className="font-display text-4xl md:text-5xl mt-3">{title}</h1>
          <p className="mt-3 text-xs text-muted-foreground">Última atualização: {updatedAt}</p>
        </div>
      </section>


      <article className="max-w-[860px] mx-auto px-6 py-14 prose-legal">
        {children}
      </article>

      <section className="border-t border-border bg-background py-12">
        <div className="max-w-[860px] mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-display text-xl">Precisa de ajuda?</p>
            <p className="text-sm text-muted-foreground mt-1">Nosso atendimento responde em horário comercial.</p>
          </div>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-full font-semibold"
          >
            <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
