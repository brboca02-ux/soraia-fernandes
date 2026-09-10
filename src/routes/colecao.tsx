import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductGrid } from "@/components/ProductGrid";
import { CATEGORIES } from "@/stores/productsStore";
import { getCategorySeo } from "@/lib/categorySeo";
import { COLLECTION_CHIPS, resolveCollection } from "@/lib/collections";


interface ColecaoSearch { c?: string }

function sanitizeTerm(input: string) {
  return input.slice(0, 80).replace(/["\\():*?]/g, " ").replace(/\s+/g, " ").trim();
}

const DEFAULT_SEO = {
  title: "Coleção Soraia Fernandes — Vestidos de Festa e Moda Feminina",
  description:
    "Explore a coleção completa da Soraia Fernandes: vestidos de festa e moda feminina selecionada com curadoria. Envio para todo o Brasil.",
  h1: "Toda a Coleção",
  eyebrow: "Coleção",
  intro: "",
};

export const Route = createFileRoute("/colecao")({
  validateSearch: (search: Record<string, unknown>): ColecaoSearch => ({
    c: typeof search.c === "string" ? search.c.slice(0, 80) : undefined,
  }),
  loaderDeps: ({ search }) => ({ c: search.c }),
  loader: ({ deps }) => {
    const safe = deps.c ? sanitizeTerm(deps.c) : "";
    const seo = getCategorySeo(safe);
    return { c: safe, seo };
  },
  head: ({ loaderData }) => {
    const safe = loaderData?.c ?? "";
    const seo = loaderData?.seo ?? null;
    const title = seo?.title ?? DEFAULT_SEO.title;
    const description = seo?.description ?? DEFAULT_SEO.description;
    const url = `https://www.soraiafernandes.com.br/colecao${safe ? `?c=${safe}` : ""}`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
    ];
    if (seo?.keywords?.length) {
      meta.push({ name: "keywords", content: seo.keywords.join(", ") });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ColecaoPage,
});

function ColecaoPage() {
  const { c } = Route.useSearch();
  const safe = c ? sanitizeTerm(c) : "";
  const activeCat = CATEGORIES.find((cat) => cat.id === safe);
  const seo = getCategorySeo(safe);
  const h1 = seo?.h1 ?? (activeCat ? activeCat.name : safe ? safe.charAt(0).toUpperCase() + safe.slice(1) : DEFAULT_SEO.h1);
  const eyebrow = seo?.eyebrow ?? DEFAULT_SEO.eyebrow;
  const intro = seo?.intro ?? DEFAULT_SEO.intro;
  const query = safe || undefined;

  const chip = (active: boolean) =>
    `inline-flex items-center justify-center min-h-11 px-4 py-2 rounded-full text-sm border transition-colors ${
      active
        ? "bg-foreground text-background border-foreground"
        : "bg-background text-foreground border-border hover:border-foreground"
    }`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: "https://www.soraiafernandes.com.br/" },
      { "@type": "ListItem", position: 2, name: "Coleção", item: "https://www.soraiafernandes.com.br/colecao" },

      ...(seo
        ? [{ "@type": "ListItem", position: 3, name: seo.name, item: `https://www.soraiafernandes.com.br/colecao?c=${seo.id}` }]
        : []),
    ],
  };

  return (
    <div className="bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <nav aria-label="breadcrumb" className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-4 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/" className="inline-flex items-center min-h-11 pr-1 hover:text-foreground transition">Início</Link></li>
          <li aria-hidden="true">/</li>
          {seo ? (
            <>
              <li><Link to="/colecao" search={{}} className="inline-flex items-center min-h-11 px-1 hover:text-foreground transition">Coleção</Link></li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground" aria-current="page">{seo.name}</li>
            </>
          ) : (
            <li className="text-foreground" aria-current="page">Coleção</li>
          )}
        </ol>
      </nav>
      <div className="bg-background py-16 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="font-display text-4xl md:text-6xl mt-3">{h1}</h1>
          <span className="gold-rule mt-5" />
          {intro && (
            <p className="mt-6 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {intro}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-8">
        <nav aria-label="Filtrar por categoria" className="flex flex-wrap gap-2 justify-center">
          <Link to="/colecao" search={{}} className={chip(!safe)}>
            Todos
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to="/colecao"
              search={{ c: cat.id }}
              className={chip(safe === cat.id)}
            >
              {cat.name}
            </Link>
          ))}
          {COLLECTION_CHIPS.map((col) => (
            <Link
              key={col.id}
              to="/colecao"
              search={{ c: col.id }}
              className={chip(resolveCollection(safe) === resolveCollection(col.id) && !!resolveCollection(safe))}
            >
              {col.name}
            </Link>
          ))}
        </nav>

      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <h2 className="sr-only">Produtos</h2>
        <ProductGrid query={query} first={48} columns={{ mobile: 2, tablet: 3, lg: 5, desktop: 6 }} />
      </div>
    </div>
  );
}
