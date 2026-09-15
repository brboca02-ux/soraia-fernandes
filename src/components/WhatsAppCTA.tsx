import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/shopify";
import { useSiteConfig } from "@/lib/siteConfig";
import { track } from "@/lib/analytics";

export function WhatsAppCTA({ source = "section" }: { source?: string }) {
  const cfg = useSiteConfig();
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <h3 className="font-display text-2xl md:text-3xl">{cfg.whatsappCtaTitle}</h3>
          <p className="text-sm md:text-base mt-2 opacity-90">{cfg.whatsappCtaSubtitle}</p>
        </div>
        <a
          href={buildWhatsAppLink("Olá! Preciso de ajuda para escolher uma peça da Soraia Fernandes.")}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track.whatsappClick(source)}
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold px-6 py-3 rounded-full transition shrink-0"
        >
          <MessageCircle className="h-5 w-5" />
          Falar no WhatsApp
        </a>
      </div>
    </section>
  );
}
