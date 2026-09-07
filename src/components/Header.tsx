import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouterState } from "@tanstack/react-router";
import { Search, User, MessageCircle, Menu, X, ChevronDown } from "lucide-react";
import { CartDrawer } from "./CartDrawer";
import { SearchBox } from "./SearchBox";
import { buildWhatsAppLink } from "@/lib/shopify";
import { track } from "@/lib/analytics";

type SearchParam = { c?: string };
type LinkItem = { label: string; c: string; highlight?: boolean };
type Column = { title: string; items: LinkItem[] };
type MegaContent = {
  columns: Column[];
  promo?: { title: string; subtitle?: string; cta: string; c: string };
};

const COMPRAR: MegaContent = {
  columns: [
    {
      title: "Vestidos",
      items: [
        { label: "Vestidos Longos", c: "vestido-longo" },
        { label: "Vestidos Midi", c: "vestido-midi" },
        { label: "Vestidos Curtos", c: "vestido-curto" },
        { label: "Ver tudo", c: "feminino" },
      ],
    },
    {
      title: "Coleções",
      items: [
        { label: "Recebidos da Semana", c: "recebidos-da-semana" },
        { label: "Promoções", c: "promocoes", highlight: true },
      ],
    },
  ],
  promo: {
    title: "Toda semana novidades",
    subtitle: "Vestidos recém-chegados na Soraia Fernandes",
    cta: "Ver Coleção",
    c: "feminino",
  },
};

type MenuKey = "comprar" | null;

const MENUS: { key: Exclude<MenuKey, null>; label: string; content: MegaContent; highlight?: boolean; badge?: string }[] = [
  { key: "comprar", label: "Comprar", content: COMPRAR },
];



export function Header() {
  const [open, setOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
    setActiveMenu(null);
    setMobileSearch(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMenu(null);
        setOpen(false);
      }
    }
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setActiveMenu(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-background text-foreground border-b border-gold/20">
      <div className="bg-black text-gold border-b border-gold/10 py-1 md:py-2.5 overflow-hidden relative">
        <div className="flex animate-marquee whitespace-nowrap gap-4 md:gap-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-6 md:gap-16 px-4 md:px-8">
              <span className="text-[9px] md:text-xs font-semibold tracking-[0.2em] uppercase">Entregamos para todo o Brasil</span>
              <span className="h-0.5 w-0.5 md:h-1 md:w-1 bg-gold rounded-full opacity-50" />
              <span className="text-[9px] md:text-xs font-semibold tracking-[0.2em] uppercase">Parcelamento em até 10x</span>
              <span className="h-0.5 w-0.5 md:h-1 md:w-1 bg-gold rounded-full opacity-50" />
              <span className="text-[9px] md:text-xs font-semibold tracking-[0.2em] uppercase">Atendimento Personalizado</span>
              <span className="h-0.5 w-0.5 md:h-1 md:w-1 bg-gold rounded-full opacity-50" />
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
        <button
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="md:hidden tap-target -ml-2 flex items-center justify-center text-gold"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link to="/" className="flex flex-col items-center tap-target group" aria-label="J&S Store">
          <span className="font-display font-bold text-2xl sm:text-3xl tracking-[0.1em] text-gold transition-transform group-hover:scale-105">
            J&S
          </span>
          <span className="text-[7px] tracking-[0.3em] uppercase text-silver font-medium -mt-1 opacity-80">
            STORE
          </span>
        </Link>
        <div className="hidden md:flex flex-1 max-w-md">
          <SearchBox variant="dark" />
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          <a
            href={buildWhatsAppLink("Olá! Vim pelo site da J&S Store e gostaria de ajuda.")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            onClick={() => track.whatsappClick("header")}
            className="hidden lg:inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/20"
          >
            <MessageCircle className="h-4 w-4 fill-current" /> WHATSAPP
          </a>

          <button aria-label="Buscar" onClick={() => setMobileSearch((v) => !v)} className="md:hidden tap-target flex items-center justify-center text-gold">
            <Search className="h-6 w-6" />
          </button>
          <Link to="/dashboard" aria-label="Painel administrativo" title="Painel admin" className="hidden sm:inline-flex tap-target items-center justify-center text-gold hover:text-silver transition-colors">
            <User className="h-6 w-6" />
          </Link>
          <CartDrawer />
        </div>
      </div>
      {mobileSearch && (
        <div className="md:hidden px-4 pb-3"><SearchBox variant="dark" autoFocus onNavigate={() => setMobileSearch(false)} /></div>
      )}

      {/* Desktop nav with mega menu */}
      <div ref={navRef} className="hidden md:block relative">
        <nav className="flex items-center justify-center gap-6 lg:gap-8 pb-3 text-sm font-medium text-foreground">
          {MENUS.map((m) => (
            <button
              key={m.key}
              onMouseEnter={() => setActiveMenu(m.key)}
              onFocus={() => setActiveMenu(m.key)}
              onClick={() => setActiveMenu((v) => (v === m.key ? null : m.key))}
              aria-expanded={activeMenu === m.key}
              aria-haspopup="true"
              className={`inline-flex items-center tap-target gap-1 transition ${
                m.highlight ? "text-gold font-semibold" : "text-foreground/80"
              } hover:text-gold px-2`}
            >
              {m.label}
              {m.badge && (
                <span className="ml-1 text-[9px] font-semibold tracking-[0.18em] bg-gold text-primary-foreground px-1.5 py-0.5 rounded-sm">
                  {m.badge}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeMenu === m.key ? "rotate-180" : ""}`} />
            </button>
          ))}
          <Link to="/colecao" search={{ c: "recebidos-da-semana" } as never} className="tap-target px-2 text-foreground/80 hover:text-gold transition">
            Recebidos da Semana
          </Link>
          <Link
            to="/alugar"
            className="tap-target px-2 font-semibold text-gold hover:text-gold/80 transition inline-flex items-center gap-1"
          >
            ✦ Alugar Vestido
          </Link>
          <Link to="/sobre" className="tap-target px-2 text-foreground/80 hover:text-gold transition">
            Sobre
          </Link>
        </nav>


        {activeMenu && (
          <div
            onMouseLeave={() => setActiveMenu(null)}
            className="absolute left-0 right-0 top-full z-50 animate-fade-in"
          >
            <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
              <div className="bg-background border border-gold/20 rounded-2xl shadow-2xl p-8 grid grid-cols-12 gap-8">
                {MENUS.find((m) => m.key === activeMenu)!.content.columns.map((col) => (
                  <div key={col.title} className="col-span-12 sm:col-span-4 lg:col-span-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3">
                      {col.title}
                    </h2>
                    <ul className="space-y-2">
                      {col.items.map((it) => (
                        <li key={it.label}>
                          <Link
                            to="/colecao"
                            search={{ c: it.c } as SearchParam as never}
                            onClick={() => setActiveMenu(null)}
                            className={`text-sm hover:text-gold transition ${
                              it.highlight ? "text-gold font-semibold" : "text-foreground/80"
                            }`}
                          >
                            {it.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {MENUS.find((m) => m.key === activeMenu)!.content.promo && (
                  <div className="col-span-12 lg:col-span-3 lg:col-start-10">
                    {(() => {
                      const p = MENUS.find((m) => m.key === activeMenu)!.content.promo!;
                      return (
                        <div className="h-full bg-gold/10 border border-gold/20 rounded-xl p-6 flex flex-col justify-between">
                          <div>
                            <h3 className="font-display text-lg font-bold text-gold mb-1">{p.title}</h3>
                            {p.subtitle && <p className="text-sm text-foreground/70">{p.subtitle}</p>}
                          </div>
                          <Link
                            to="/colecao"
                            search={{ c: p.c } as SearchParam as never}
                            onClick={() => setActiveMenu(null)}
                            className="mt-4 inline-flex items-center justify-center bg-gold text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                          >
                            {p.cta}
                          </Link>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {open && typeof document !== "undefined" && createPortal((
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[85%] max-w-sm bg-background text-foreground shadow-2xl flex flex-col animate-in slide-in-from-left">
            <div className="flex items-center justify-between px-5 h-14 border-b border-gold/20">
              <div className="flex flex-col items-start leading-none">
                <span className="font-display font-bold text-xl tracking-[0.1em] text-gold uppercase">J&S</span>
                <span className="text-[8px] tracking-[0.4em] uppercase text-silver font-medium">STORE</span>
              </div>
              <button aria-label="Fechar" onClick={() => setOpen(false)} className="h-11 w-11 -mr-2 flex items-center justify-center text-foreground hover:text-gold transition">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="px-5 py-4 border-b border-gold/20">
              <SearchBox variant="dark" onNavigate={() => setOpen(false)} />
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {MENUS.map((m) => {
                const isOpen = mobileAccordion === m.key;
                return (
                  <div key={m.key} className="border-b border-gold/20">
                    <button
                      onClick={() => setMobileAccordion(isOpen ? null : m.key)}
                      aria-expanded={isOpen}
                      className={`w-full flex items-center justify-between px-5 py-3 text-base font-semibold ${
                        m.highlight ? "text-gold" : "text-foreground/90"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {m.label}
                        {m.badge && (
                          <span className="text-[9px] font-semibold tracking-[0.18em] bg-gold text-primary-foreground px-1.5 py-0.5 rounded-sm">
                            {m.badge}
                          </span>
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 pb-3 space-y-3">
                          {m.content.columns.map((col) => (
                            <div key={col.title}>
                              <p className="text-[11px] uppercase tracking-wider text-foreground/60 mt-2 mb-1">
                                {col.title}
                              </p>
                              <ul className="space-y-1.5">
                                {col.items.map((it) => (
                                  <li key={it.label}>
                                    <Link
                                      to="/colecao"
                                      search={{ c: it.c } as SearchParam as never}
                                      onClick={() => setOpen(false)}
                                      className={`block text-sm py-1 hover:text-gold transition ${
                                        it.highlight ? "text-gold font-medium" : "text-foreground/80"
                                      }`}
                                    >
                                      {it.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Link
                to="/colecao"
                search={{ c: "recebidos-da-semana" } as never}
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-base font-semibold border-b border-gold/20 text-foreground hover:text-gold transition"
              >
                Recebidos da Semana
              </Link>
              <Link
                to="/alugar"
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-base font-semibold border-b border-gold/20 text-gold hover:text-gold/80 transition"
              >
                ✦ Alugar Vestido
              </Link>
              <Link
                to="/sobre"
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-base font-semibold border-b border-gold/20 text-foreground hover:text-gold transition"
              >
                Sobre
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="block px-5 py-3 text-base font-semibold border-b border-gold/20 text-gold hover:text-gold/80 transition"
              >
                Painel admin
              </Link>
            </nav>
            <a
              href={buildWhatsAppLink("Olá! Vim pelo site da J&S Store e gostaria de ajuda.")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track.whatsappClick("mobile-menu")}
              className="m-4 inline-flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-full text-sm font-semibold"
            >
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </a>
          </aside>
        </div>
      ), document.body)}
    </header>
  );
}
