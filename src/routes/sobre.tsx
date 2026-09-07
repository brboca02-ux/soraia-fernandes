﻿import { createFileRoute } from "@tanstack/react-router";
import { MapPin, MessageCircle, Clock, Heart } from "lucide-react";
import { STORE_INFO, buildWhatsAppLink } from "@/lib/shopify";
import lookbook1 from "@/assets/lookbook-1.jpg";
import lookbook2 from "@/assets/lookbook-2.jpg";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Soraia Fernandes â€” Vestidos de Festa" },
      { name: "description", content: "ConheÃ§a a Soraia Fernandes, especializada em vestidos de festa e moda feminina. Atendimento pelo WhatsApp e venda online para todo o Brasil." },
      { property: "og:title", content: "Sobre a Soraia Fernandes" },
      { property: "og:description", content: "Loja fÃ­sica e online especializada em vestidos de festa, atendimento humanizado e moda acessÃ­vel." },
      { property: "og:url", content: "https://www.soraiafernandes.com.br/sobre" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.soraiafernandes.com.br/sobre" }],
  }),
  component: SobrePage,
});


function SobrePage() {
  const wa = buildWhatsAppLink("OlÃ¡! Vim pelo site da Soraia Fernandes e gostaria de tirar uma dÃºvida.");
  return (
    <div className="bg-background">
      <Breadcrumbs
        items={[
          { name: "InÃ­cio", href: "/" },
          { name: "Sobre", href: "/sobre" },
        ]}
      />
      <section className="bg-background py-16 border-b border-border">

        <div className="max-w-[1100px] mx-auto px-6 text-center">
          <span className="eyebrow">Nossa histÃ³ria</span>
          <h1 className="font-display text-4xl md:text-6xl mt-3">Sobre a Soraia Fernandes</h1>
          <span className="gold-rule mt-5" />
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            HÃ¡ anos vestindo Joinville com peÃ§as selecionadas com carinho. Acreditamos em moda
            acessÃ­vel, atendimento prÃ³ximo e na confianÃ§a de quem compra na loja do bairro.
          </p>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <img src={lookbook1} alt="Soraia Fernandes â€” Vestidos de Festa em Joinville" className="w-full aspect-[4/5] object-cover rounded-md" />
        <div>
          <h2 className="font-display text-3xl md:text-4xl">Uma loja real, feita por pessoas reais</h2>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            ComeÃ§amos com a vontade de oferecer peÃ§as bonitas, de qualidade e com preÃ§o justo.
            Hoje, somos referÃªncia em vestidos de festa em Joinville, com novidades chegando toda semana e um atendimento dedicado pelo WhatsApp.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Curadoria semanal de novidades</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Consultoria de estilo no WhatsApp</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Loja fÃ­sica em {STORE_INFO.city}/{STORE_INFO.region}</li>
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Seg a SÃ¡b Â· 9h Ã s 18h</li>
          </ul>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-full font-semibold">
            <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
          </a>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1">
            <span className="eyebrow">Visite a loja</span>
            <h2 className="font-display text-3xl md:text-4xl mt-3">Onde estamos</h2>
            <span className="gold-rule mt-4" />
            <p className="mt-5 text-muted-foreground leading-relaxed">{STORE_INFO.street} â€” {STORE_INFO.city}/{STORE_INFO.region}</p>
            <p className="text-muted-foreground">CEP {STORE_INFO.postalCode} Â· Tel {STORE_INFO.phone}</p>
            <img src={lookbook2} alt="Fachada da loja" className="mt-6 w-full aspect-[3/2] object-cover rounded-md" />
          </div>
          <div className="order-1 md:order-2 aspect-[4/3] overflow-hidden rounded-md border border-border">
            <iframe
              title="Mapa Soraia Fernandes Joinville"
              src={STORE_INFO.mapsEmbed}
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

