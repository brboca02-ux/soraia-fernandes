import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";

const ADMIN_PREFIXES = [
  "/dashboard",
  "/produtos",
  "/pedidos",
  "/clientes",
  "/marketing",
  "/admin",
  "/estoque",
  "/categorias",
  "/login",
];
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { LeadPopup } from "@/components/LeadPopup";
import { useCartSync } from "@/hooks/useCartSync";
import { useHydrateStores } from "@/hooks/useHydrateStores";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/soraya-fernandes-logo.png.asset.json";

/** Sincroniza router/cache com o estado de autenticação e conclui o retorno do OAuth. */
function useAuthSync() {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();

      if (event === "SIGNED_IN" && session) {
        let target: string | null = null;
        try {
          target = sessionStorage.getItem("js_post_login_redirect");
          sessionStorage.removeItem("js_post_login_redirect");
        } catch { /* ignore */ }
        if (target && target.startsWith("/") && !target.startsWith("//")) {
          router.navigate({ to: target });
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl">404</h1>
        <span className="gold-rule mt-6 inline-block" />
        <p className="mt-6 text-sm text-muted-foreground">Esta página não existe ou foi movida.</p>
        <div className="mt-8">
          <Link to="/" className="inline-block bg-foreground text-background px-8 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-foreground/85 transition">
            Voltar à loja
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Algo deu errado</h1>
        <p className="mt-3 text-sm text-muted-foreground">Tente novamente em instantes.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-block bg-foreground text-background px-8 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-foreground/85"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Soraia Fernandes — Moda Festa" },
      { name: "description", content: "Soraia Fernandes: vestidos de festa e moda feminina. Encontre o look perfeito para cada ocasião com envio para todo o Brasil." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Soraia Fernandes Moda Festa" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@soraifernandes" },
      { name: "theme-color", content: "#0A0A0A" },
      { name: "format-detection", content: "telephone=no" },
      { property: "og:title", content: "Soraia Fernandes — Moda Festa" },
      { name: "twitter:title", content: "Soraia Fernandes — Moda Festa" },
      { property: "og:description", content: "Soraia Fernandes: vestidos de festa e moda feminina. Encontre o look perfeito para cada ocasião com envio para todo o Brasil." },
      { name: "twitter:description", content: "Soraia Fernandes: vestidos de festa e moda feminina. Encontre o look perfeito para cada ocasião com envio para todo o Brasil." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b1021764-cbe2-4aff-b74a-fead97b3375b" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b1021764-cbe2-4aff-b74a-fead97b3375b" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" },
      { rel: "alternate", hrefLang: "pt-BR", href: "https://www.soraiafernandes.com.br/" },
      { rel: "alternate", hrefLang: "x-default", href: "https://www.soraiafernandes.com.br/" },

    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

const SITE_URL = "https://www.soraiafernandes.com.br";
const LOGO_URL = `${SITE_URL}${logoAsset.url}`;

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Soraia Fernandes Moda Festa",
  url: `${SITE_URL}/`,
  logo: {
    "@type": "ImageObject",
    url: LOGO_URL,
  },
  description:
    "Soraia Fernandes — vestidos de festa e moda feminina. Encontre o look perfeito para cada ocasião com envio para todo o Brasil.",
  telephone: "+55 47 99189-9393",
  email: "contato@soraiafernandes.com.br",
  address: {
    "@type": "PostalAddress",
    streetAddress: "R. Evaldo Martin Junkes, 820 - Loja 4 - Aventureiro",
    addressLocality: "Joinville",
    addressRegion: "SC",
    postalCode: "89225-673",
    addressCountry: "BR",
  },
  sameAs: ["https://www.instagram.com/soraiafernandes/"],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: "Soraia Fernandes Moda Festa",
  inLanguage: "pt-BR",
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/colecao?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  "@id": `${SITE_URL}/#store`,
  name: "Soraia Fernandes Moda Festa",
  description:
    "Soraia Fernandes — vestidos de festa e moda feminina com envio para todo o Brasil.",
  image: LOGO_URL,
  logo: LOGO_URL,
  url: `${SITE_URL}/`,
  telephone: "+55 47 99189-9393",
  priceRange: "$$",
  currenciesAccepted: "BRL",
  paymentAccepted: "Pix, Cartão de crédito, Boleto",
  address: {
    "@type": "PostalAddress",
    streetAddress: "R. Evaldo Martin Junkes, 820 - Loja 4 - Aventureiro",
    addressLocality: "Joinville",
    addressRegion: "SC",
    postalCode: "89225-673",
    addressCountry: "BR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -26.3036,
    longitude: -48.848,
  },
  hasMap:
    "https://www.google.com/maps?q=R.+Evaldo+Martin+Junkes%2C+820+-+Loja+4+-+Aventureiro%2C+Joinville%2C+Santa+Catarina%2C+Brazil+89225-673",
  areaServed: [
    { "@type": "City", name: "Joinville" },
    { "@type": "AdministrativeArea", name: "Santa Catarina" },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "13:00",
    },
  ],
  sameAs: ["https://www.instagram.com/soraiafernandes/"],
};

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
        {GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');` }} />
          </>
        )}
        {META_PIXEL_ID && (
          <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');` }} />
        )}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  useCartSync();
  useHydrateStores();
  useAuthSync();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminArea = ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isAdminArea) {
    return (
      <>
        <main id="conteudo" tabIndex={-1} className="min-h-screen">
          <Outlet />
        </main>
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="min-h-[60vh] pb-24 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
      <LeadPopup />
      <Toaster position="top-center" />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
