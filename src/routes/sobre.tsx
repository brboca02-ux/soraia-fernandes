﻿import { createFileRoute } from "@tanstack/react-router";
import { MapPin, MessageCircle, Clock, Heart } from "lucide-react";
import { STORE_INFO, buildWhatsAppLink } from "@/lib/shopify";
import soraiaSobre from "@/assets/soraia-sobre.jpeg.asset.json";
import lookbook2 from "@/assets/lookbook-2.jpg";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Soraia Fernandes Vestidos de Festa" },
      { name: "description", content: "Por trás de cada vestido deslumbrante e de cada detalhe da Soraia Fernandes Moda Festa, existe uma paixão que me move: ajudar você a viver os seus momentos mais inesquecíveis com a confiança que você merece." },
      { property: "og:title", content: "Sobre a Soraia Fernandes" },
      { property: "og:description", content: "Loja fi­sica e online especializada em vestidos de festa, atendimento humanizado e moda acessi­vel." },
      { property: "og:url", content: "https://www.soraiafernandes.com.br/sobre" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.soraiafernandes.com.br/sobre" }],
  }),
  component: SobrePage,
});


function SobrePage() {
  const wa = buildWhatsAppLink("Ola¡! Vim pelo site da Soraia Fernandes e gostaria de tirar uma duvida.");
  return (
    <div className="bg-background">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Sobre", href: "/sobre" },
        ]}
      />
      <section className="bg-background py-16 border-b border-border">

        <div className="max-w-[1100px] mx-auto px-6 text-center">
          <span className="eyebrow">Nossa historia</span>
          <h1 className="font-display text-4xl md:text-6xl mt-3">Sobre a Soraia Fernandes</h1>
          <span className="gold-rule mt-5" />
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Por trás de cada vestido deslumbrante e de cada detalhe da Soraia Fernandes Moda Festa, existe uma paixão que me move: ajudar você a viver os seus momentos mais inesquecíveis com a confiança que você merece.
          </p>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <img
          src={soraiaSobre.url}
          alt="Soraia Fernandes na loja de moda festa em Joinville"
          width={768}
          height={1026}
          className="w-full aspect-[4/5] object-cover rounded-md"
        />
        <div>
          <h2 className="font-display text-3xl md:text-4xl">Uma loja real, feita por pessoas reais</h2>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Sempre fui apaixonada pelo poder transformador da moda. Para mim, escolher a roupa certa para uma celebração não é apenas sobre etiqueta ou tendências, mas sobre como você se sente ao entrar no salão. Foi por isso que fundei a Soraia Fernandes Moda Festa — para curar uma coleção de roupas de festa que unem sofisticação, caimento impecável e aquela dose de brilho que todo grande momento pede.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Curadoria semanal de novidades</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Consultoria de estilo no WhatsApp</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Loja fi­sica em {STORE_INFO.city}/{STORE_INFO.region}</li>
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Seg a Sex · 10h as 19h</li>
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
            <p className="mt-5 text-muted-foreground leading-relaxed">{STORE_INFO.street} ” {STORE_INFO.city}/{STORE_INFO.region}</p>
            <p className="text-muted-foreground">CEP {STORE_INFO.postalCode} Â· Tel {STORE_INFO.phone}</p>
            
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

