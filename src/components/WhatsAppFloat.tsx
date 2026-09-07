import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/shopify";
import { track } from "@/lib/analytics";

export function WhatsAppFloat() {
  return (
    <a
      href={buildWhatsAppLink("Olá! Vim pelo site da Soraia Fernandes e gostaria de ajuda.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Atendimento WhatsApp"
      onClick={() => track.whatsappClick("float")}
      className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50 flex items-center gap-3 bg-[#25D366] text-white p-3 lg:pl-4 lg:pr-5 lg:py-3 rounded-full shadow-xl hover:scale-105 transition"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={2} />
      <span className="hidden lg:inline text-sm font-semibold">Precisa de ajuda? Fale conosco</span>
    </a>
  );
}
