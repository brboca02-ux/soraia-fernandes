import { createFileRoute } from "@tanstack/react-router";
import {
  HomeHero,
  TrustStrip,
  CategoriesSection,
  RecebidosHomeSection,
  LookbookSection,
  LojaFisicaSection,
  DifferentialsSection,
  InstagramSection,
} from "@/components/HomeSections";
import { ShowcaseCarousel } from "@/components/ShowcaseCarousel";
import { NewsletterSection } from "@/components/NewsletterCapture";
import heroCouple from "@/assets/hero-couple.jpg.asset.json?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soraia Fernandes — Vestidos de Festa e Moda Feminina" },
      { name: "description", content: "Soraia Fernandes: vestidos de festa e moda feminina para todas as ocasiões. Compre online com envio para todo o Brasil." },
      { name: "keywords", content: "vestidos de festa, moda feminina, Soraia Fernandes, vestido para casamento, vestido para formatura" },
      { name: "geo.region", content: "BR-SC" },
      { name: "geo.placename", content: "Joinville" },
      { property: "og:title", content: "Soraia Fernandes — Vestidos de Festa e Moda Feminina" },
      { property: "og:description", content: "Soraia Fernandes: vestidos de festa e moda feminina para todas as ocasiões. Compre online com envio para todo o Brasil." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.soraiafernandes.com.br/" },
      { property: "og:locale", content: "pt_BR" },
    ],
    links: [
      { rel: "canonical", href: "https://www.soraiafernandes.com.br/" },

      // Preload LCP hero with high priority
      { rel: "preload", as: "image", href: heroCouple, fetchPriority: "high" },
    ],
  }),
  component: Index,
});

function Index() {

  return (
    <>
      <HomeHero />
      <TrustStrip />
      <CategoriesSection />
      <ShowcaseCarousel />
      <RecebidosHomeSection />
      <LookbookSection />
      <LojaFisicaSection />
      <DifferentialsSection />
      <InstagramSection />
      <NewsletterSection />
    </>
  );
}
