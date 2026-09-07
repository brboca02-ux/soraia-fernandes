import { Link } from "@tanstack/react-router";
import heroCouple from "@/assets/hero-couple.jpg.asset.json";
import catFeminino from "@/assets/cat-feminino.webp.asset.json";
import catMasculino from "@/assets/cat-masculino.webp.asset.json";
import { useSiteMedia, type SiteMediaKey } from "@/lib/api/siteMedia";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/ProductGrid";
import { Truck, RefreshCcw, ShieldCheck, MessageCircle, MapPin, Clock, Instagram } from "lucide-react";
import { buildWhatsAppLink, STORE_INFO } from "@/lib/shopify";
import { track } from "@/lib/analytics";

export const INSTAGRAM_HANDLE = "soraiafernandes";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

// Imagens do catálogo real, servidas pelo proxy público do storage.
const CAT_IMG = (slug: string) => `/api/public/img/catalogo/${slug}.jpg`;

const categories = [
  { label: "Feminino", alt: "Categoria Moda Feminina Soraia Fernandes", img: catFeminino.url, origin: "50% 18%", q: "feminino", mediaKey: "cat_feminino" as SiteMediaKey, desc: "Elegância no dia a dia" },
  { label: "Masculino", alt: "Categoria Moda Masculina Soraia Fernandes", img: catMasculino.url, origin: "50% 12%", q: "masculino", mediaKey: "cat_masculino" as SiteMediaKey, desc: "Clássico com atitude" },
];

const diferenciais = [
  { i: Truck, t: "Frete para todo Brasil", d: "Envio expresso e seguro" },
  { i: RefreshCcw, t: "Troca facilitada", d: "Até 30 dias para você decidir" },
  { i: ShieldCheck, t: "Compra segura", d: "Pagamento criptografado" },
  { i: MessageCircle, t: "Atendimento humanizado", d: "Consultoras dedicadas" },
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative w-full px-0">
        {/* Mobile H1 - SEO first, hidden visually to save space but kept for indexing */}
        <h1 className="sr-only">
          Soraia Fernandes — Vestidos de Festa e Moda Feminina
        </h1>

        <div className="relative w-full overflow-hidden flex items-center justify-center sm:aspect-video lg:aspect-[21/9] h-auto">
          <img
            src={heroCouple.url}
            alt="Soraia Fernandes — Vestidos de Festa e Moda Feminina"
            width={1376}
            height={768}
            fetchPriority="high"
            className="w-full h-full object-cover sm:object-cover sm:object-center opacity-90 transition-transform duration-[2000ms] hover:scale-105"
          />
          {/* Overlay escuro estratégico reforçado na base para legibilidade dos botões */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Desktop SEO H1 */}
          <h1 className="sr-only sm:not-sr-only sm:absolute sm:left-10 sm:top-1/3 sm:max-w-xl sm:text-5xl lg:text-7xl sm:font-bold sm:tracking-tighter sm:text-white sm:leading-[0.9] hidden">
            MODA PARA O<br />SEU DIA A DIA.
          </h1>
          
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-6 md:pb-12">
            <div className="max-w-2xl w-full px-6 text-center">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <Button
                  size="xl"
                  className="bg-gold hover:bg-gold/90 text-primary-foreground rounded-none px-8 lg:px-12 font-semibold shadow-xl h-12 sm:h-12 text-xs tracking-widest uppercase"
                  asChild
                >
                  <Link to="/colecao" search={{ c: "feminino" }}>Comprar Feminino</Link>
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  className="bg-transparent border-white/40 text-white hover:bg-white hover:text-black rounded-none px-8 lg:px-12 font-semibold shadow-xl h-12 sm:h-12 transition-all text-xs tracking-widest uppercase"
                  asChild
                >
                  <Link to="/colecao" search={{ c: "masculino" }}>Comprar Masculino</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


export function TrustStrip() {
  return (
    <div className="bg-black border-y border-gold/10 py-3 md:py-6">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-10">
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-3 gap-6 md:gap-12 no-scrollbar">
          {[
            { 
              i: Truck, 
              t: "Envio Nacional", 
              d: "Entregamos com rapidez e segurança em todo o Brasil." 
            },
            { 
              i: MessageCircle, 
              t: "Suporte VIP", 
              d: "Atendimento exclusivo via WhatsApp para sua melhor experiência." 
            },
            { 
              i: ShieldCheck, 
              t: "Pagamento Seguro", 
              d: "Sua compra protegida com as melhores tecnologias de segurança." 
            }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center space-y-2 group flex-shrink-0 min-w-[240px] sm:min-w-0">
              <div className="p-2 rounded-full bg-gold/5 border border-gold/10 group-hover:border-gold/30 transition-colors">
                <item.i className="h-4 w-4 md:h-6 md:w-6 text-gold" strokeWidth={1.2} />
              </div>
              <div>
                <h3 className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-gold mb-0.5">
                  {item.t}
                </h3>
                <p className="text-[9px] md:text-xs text-muted-foreground/80 leading-relaxed max-w-[200px] mx-auto">
                  {item.d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



export function CategoriesSection() {
  const media = useSiteMedia();
  return (
    <section className="py-4 md:py-6 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="mb-5 md:mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-gold mb-2">Escolha por estilo</p>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display font-semibold text-2xl md:text-4xl tracking-tight">Categorias</h2>
              <p className="text-sm text-muted-foreground mt-2">Duas curadorias, uma só identidade.</p>
            </div>
            <Link to="/colecao" search={{ c: undefined }} className="hidden md:inline text-xs font-medium text-gold hover:underline underline-offset-4">
              Ver tudo →
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {categories.map((c) => (
            <Link
              key={c.label}
              to="/colecao"
              search={{ c: c.q }}
              className="group relative h-[180px] md:h-[240px] overflow-hidden bg-secondary shadow-lg"
            >
              <picture>
                <source srcSet={`${media[c.mediaKey] ?? c.img}?width=600&format=webp`} type="image/webp" />
                <img
                  src={media[c.mediaKey] ?? c.img}
                  alt={c.alt}
                  width={600}
                  height={300}
                  className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.1]"
                  style={{ objectPosition: c.origin }}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end px-3 pb-2.5 md:pb-4 text-center">
                <h3 className="font-display font-semibold text-lg md:text-2xl text-white tracking-wide uppercase mb-0.5">
                  {c.label}
                </h3>
                <p className="text-[9px] md:text-[10px] text-gold/90 font-medium tracking-[0.2em] uppercase mb-1.5">
                  {c.desc}
                </p>
                <div className="hidden md:block h-[1px] w-8 bg-gold/40 mb-1.5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <p className="hidden md:block text-[8px] md:text-[9px] text-white/70 font-medium tracking-[0.2em] uppercase transition-all duration-500 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                  Explorar curadoria →
                </p>
              </div>

            </Link>
          ))}
        </div>
      </div>
    </section>

  );
}



function SectionHeader({ kicker, title, subtitle, link }: { kicker?: string; title: string; subtitle?: string; link?: { to: string; label: string; c?: string } }) {
  return (
    <div className="flex items-end justify-between mb-5 md:mb-6">
      <div>
        {kicker && <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground mb-3">{kicker}</p>}
        <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-xl">{subtitle}</p>}
      </div>
      {link && (
        <Link to="/colecao" search={{ c: link.c }} className="hidden md:inline text-sm font-medium text-foreground hover:text-primary underline-offset-4 hover:underline whitespace-nowrap ml-6">
          {link.label} →
        </Link>
      )}
    </div>
  );
}

export function BestSellersSection() {
  return (
    <section className="section-compact bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <SectionHeader kicker="Os queridinhos da loja" title="Mais Vendidos" subtitle="As peças preferidas pelas clientes da Soraia Fernandes." link={{ to: "/colecao", label: "Ver todos", c: "mais-vendidos" }} />
        <ProductGrid sortKey="BEST_SELLING" first={12} columns={{ mobile: 2, tablet: 3, lg: 5, desktop: 6 }} />
      </div>
    </section>
  );
}

export function LaunchSection() {
  return (
    <section id="colecao" className="section-compact bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <SectionHeader kicker="Acabou de chegar" title="Novidades" link={{ to: "/colecao", label: "Ver coleção", c: "novidades" }} />
        <ProductGrid sortKey="CREATED_AT" reverse first={12} columns={{ mobile: 2, tablet: 3, lg: 5, desktop: 6 }} />
      </div>
    </section>
  );
}

export function RecebidosHomeSection() {
  return (
    <section className="section-compact bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <SectionHeader kicker="Esta semana" title="Recebidos da Semana" link={{ to: "/colecao", label: "Ver lançamentos", c: "recebidos-da-semana" }} />
        <ProductGrid sortKey="CREATED_AT" reverse first={5} columns={{ mobile: 2, tablet: 3, desktop: 5 }} />
      </div>
    </section>
  );
}

export function LookbookSection() {
  return (
    <section className="section-compact bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center space-y-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-foreground/60">Editorial Soraia Fernandes</p>
        <h2 className="font-display font-semibold text-3xl md:text-5xl leading-tight">
          Moda para o seu dia, na sua cidade.
        </h2>
        <p className="text-base text-foreground/75 leading-relaxed max-w-xl mx-auto">
          Há anos vestindo mulheres e homens de Joinville com peças selecionadas para o
          dia a dia, trabalho e ocasiões especiais. Atendimento próximo, curadoria honesta
          e o cuidado de uma loja física feita por gente da cidade.
        </p>
        <div className="pt-2 flex flex-wrap gap-3 justify-center">
          <Button size="xl" className="bg-gold hover:bg-gold/90 text-primary-foreground rounded-none px-8" asChild>
            <Link to="/colecao" search={{ c: undefined }}>Explorar coleção</Link>
          </Button>
          <Button size="xl" variant="outline" className="bg-transparent border-gold text-gold hover:bg-gold hover:text-primary-foreground rounded-none px-8" asChild>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <Instagram className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Siga @{INSTAGRAM_HANDLE}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}


export function LojaFisicaSection() {
  return (
    <section id="loja" aria-labelledby="loja-titulo" className="section-compact bg-background scroll-mt-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="aspect-[4/3] overflow-hidden bg-secondary order-2 md:order-1">
          <iframe
            src={STORE_INFO.mapsEmbed}
            title={`Localização ${STORE_INFO.name}`}
            loading="lazy"
            className="w-full h-full border-0"
          />
        </div>
        <div className="space-y-5 order-1 md:order-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Visite nossa loja</p>
          <h2 id="loja-titulo" className="font-display font-semibold text-3xl md:text-4xl tracking-tight">
            Soraia Fernandes — Joinville/SC
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-foreground shrink-0" /> {STORE_INFO.street} — {STORE_INFO.city}/{STORE_INFO.region}</p>
            <p className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5 text-foreground shrink-0" /> Seg a Sex: 9h–18h · Sáb: 9h–13h</p>
            <p className="flex items-start gap-2"><MessageCircle className="h-4 w-4 mt-0.5 text-foreground shrink-0" /> WhatsApp: atendimento próximo e humanizado</p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button size="lg" className="bg-foreground hover:bg-foreground/90 text-background rounded-none px-6" asChild>
              <a href={STORE_INFO.mapsEmbed.replace("&output=embed", "")} target="_blank" rel="noopener noreferrer">Como Chegar</a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-none px-6 border-foreground" asChild>
              <a
                href={buildWhatsAppLink("Olá! Vim pelo site e quero saber mais sobre a loja.")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track.whatsappClick("loja-fisica")}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Falar no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DifferentialsSection() {
  return (
    <section className="section-compact bg-background border-y border-border">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {diferenciais.map(({ i: Icon, t, d }) => (
          <div key={t} className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <h3 className="font-semibold text-sm">{t}</h3>
              <p className="text-xs text-muted-foreground mt-1">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InstagramSection() {
  return (
    <section className="section-compact bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground mb-3 inline-flex items-center gap-2">
            <Instagram className="h-3.5 w-3.5" strokeWidth={1.8} /> Instagram
          </p>
          <h2 className="font-display font-semibold text-3xl md:text-4xl tracking-tight">
            @{INSTAGRAM_HANDLE}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-3">
            Lançamentos, bastidores e novidades exclusivas.
          </p>
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="bg-foreground hover:bg-foreground/90 text-background rounded-none px-8"
            asChild
          >
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              Seguir @{INSTAGRAM_HANDLE}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}


