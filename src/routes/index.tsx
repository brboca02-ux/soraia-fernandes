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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soraia Fernandes — Vestidos Femininos: Compra e Aluguel em Joinville/SC" },
      { name: "description", content: "Soraia Fernandes: vestidos femininos exclusivos para compra e aluguel em Joinville. Casamentos, formaturas, festas e ocasiões especiais. Atendimento personalizado." },
      { name: "keywords", content: "vestidos femininos Joinville, aluguel de vestidos Joinville, vestidos para formatura, vestidos para casamento, Soraia Fernandes" },
      { name: "geo.region", content: "BR-SC" },
      { name: "geo.placename", content: "Joinville" },
      { property: "og:title", content: "Soraia Fernandes — Vestidos Femininos: Compra e Aluguel em Joinville/SC" },
      { property: "og:description", content: "Vestidos exclusivos para compra e aluguel. Casamentos, formaturas e eventos especiais em Joinville." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.jesstorejoinville.com.br/" },
      { property: "og:locale", content: "pt_BR" },
    ],
    links: [
      { rel: "canonical", href: "https://www.jesstorejoinville.com.br/" },
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
