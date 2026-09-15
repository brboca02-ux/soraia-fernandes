import { Fragment } from "react";


export interface BreadcrumbItem {
  name: string;
  href?: string; // absoluto (para JSON-LD) — se omitido, é o item atual
}

interface Props {
  items: BreadcrumbItem[];
  className?: string;
}

const SITE = "https://www.soraiafernandes.com.br";

/**
 * Breadcrumb visual + JSON-LD (schema.org BreadcrumbList) em um único componente.
 * O último item é sempre a página atual e não recebe link.
 */
export function Breadcrumbs({ items, className }: Props) {
  if (!items.length) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.href
        ? it.href.startsWith("http") ? it.href : `${SITE}${it.href}`
        : `${SITE}${typeof window !== "undefined" ? window.location.pathname : ""}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav
        aria-label="breadcrumb"
        className={
          className ??
          "max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-4 text-[10px] sm:text-xs text-muted-foreground overflow-x-auto no-scrollbar"
        }
      >
        <ol className="flex items-center gap-1.5 whitespace-nowrap">
          {items.map((it, i) => {
            const last = i === items.length - 1;
            return (
              <Fragment key={`${it.name}-${i}`}>
                <li className={last ? "text-foreground font-semibold" : ""} aria-current={last ? "page" : undefined}>
                  {last || !it.href ? (
                    <span className="px-1">{it.name}</span>
                  ) : (
                    <a href={it.href} className="hover:text-foreground transition min-h-[44px] inline-flex items-center px-2 -mx-1">
                      {it.name}
                    </a>
                  )}
                </li>
                {!last && <li aria-hidden="true" className="opacity-40">/</li>}
              </Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
