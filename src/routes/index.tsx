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
import homeBanner from "@/assets/banner-home-soraia.jpeg.asset.json";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soraia Fernandes — Vestidos Femininos: Compra e Aluguel em Joinville/SC" },
      { name: "description", content: "Soraia Fernandes: vestidos femininos unicos para compra e aluguel em Joinville. Casamentos, formaturas, festas e ocasiões especiais. Atendimento personalizado." },
      { name: "keywords", content: "vestidos femininos Joinville, aluguel de vestidos Joinville, vestidos para formatura, vestidos para casamento, Soraia Fernandes" },
      { name: "geo.region", content: "BR-SC" },
      { name: "geo.placename", content: "Joinville" },
      { property: "og:title", content: "Soraia Fernandes — Vestidos Femininos: Compra e Aluguel em Joinville/SC" },
      { property: "og:description", content: "Vestidos unicos para compra e aluguel. Casamentos, formaturas e eventos especiais em Joinville." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://soraiafernandesmodafesta.com.br/" },
      { property: "og:locale", content: "pt_BR" },
    ],
    links: [
      { rel: "canonical", href: "https://soraiafernandesmodafesta.com.br/" },
      { rel: "preload", as: "image", href: homeBanner.url },
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
      {/* BANNER PROMOÇÃO DE LANÇAMENTO */}
            <section className="py-8 bg-gradient-to-r from-[#2c1820] via-[#1a1118] to-[#2c1820] text-white border-y border-[#d4af37]/30 my-6">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <span className="inline-block text-xs uppercase tracking-[0.2em] text-[#d4af37] font-semibold mb-2">
              ✨ Novidade Exclusiva
            </span>
            <h2 className="text-2xl lg:text-3xl font-serif text-[#f8f5f0] tracking-wide">
              Promoção Especial de Lançamento
            </h2>
            <p className="text-sm text-neutral-300 mt-1 max-w-xl">
              Celebre a estreia da nossa nova loja online com condições imperdíveis em peças selecionadas por tempo limitado.
            </p>
          </div>

          <Link
            to="/colecao"
            className="shrink-0 px-8 py-3 rounded-full bg-[#d4af37] text-neutral-950 font-medium text-sm tracking-wider uppercase hover:bg-[#e5c158] transition shadow-lg hover:shadow-[#d4af37]/20"
          >
            Aproveitar Promoção
          </Link>
        </div>
      </section>


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
