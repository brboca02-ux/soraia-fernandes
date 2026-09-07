import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { storefrontApiRequest, SEARCH_SUGGESTIONS_QUERY, formatPrice } from "@/lib/shopify";
import { track } from "@/lib/analytics";


interface Suggestion {
  id: string;
  title: string;
  handle: string;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
}

function Highlight({ text, term }: { text: string; term: string }) {
  const t = term.trim();
  if (!t) return <>{text}</>;
  const parts = text.split(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === t.toLowerCase()
          ? <mark key={i} className="bg-primary/15 text-primary rounded px-0.5">{p}</mark>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export function SearchBox({ onNavigate, autoFocus = false, variant = "light" }: { onNavigate?: () => void; autoFocus?: boolean; variant?: "light" | "dark" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const term = q.trim().slice(0, 80).replace(/["\\():*?]/g, " ").replace(/\s+/g, " ").trim();
    if (term.length < 2) { setResults([]); setActive(-1); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const query = `title:*${term}* OR product_type:*${term}* OR tag:*${term}*`;
        const data = await storefrontApiRequest(SEARCH_SUGGESTIONS_QUERY, { query });
        const list = (data?.data?.products?.edges ?? []).map((e: { node: Suggestion }) => e.node);
        setResults(list);
        setActive(-1);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);


  const submit = () => {
    if (!q.trim()) return;
    track.search(q.trim());
    setOpen(false);
    onNavigate?.();
    navigate({ to: "/colecao", search: { c: q.trim() } });
  };


  const goToActive = () => {
    const p = results[active];
    if (!p) return submit();
    setOpen(false);
    onNavigate?.();
    navigate({ to: "/produto/$handle", params: { handle: p.handle } });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? results.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); goToActive(); }
  };

  const reactId = useId();
  const listboxId = `search-listbox-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div ref={ref} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className={`flex items-center gap-2 rounded-full px-5 py-3 focus-within:ring-1 ${
          variant === "dark"
            ? "bg-black/40 border border-gold/20 text-foreground focus-within:ring-gold/50"
            : "bg-secondary border border-transparent text-muted-foreground focus-within:ring-primary/40"
        }`}
      >
        <Search className={`h-4 w-4 shrink-0 ${variant === "dark" ? "text-foreground/80" : ""}`} aria-hidden="true" />
        <label className="sr-only" htmlFor={`${listboxId}-input`}>Buscar produtos</label>
        <input
          id={`${listboxId}-input`}
          autoFocus={autoFocus}
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={open && q.trim().length >= 2}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listboxId}-opt-${active}` : undefined}
          placeholder="Buscar por nome, cor, categoria..."
          className={`bg-transparent flex-1 text-sm outline-none min-w-0 ${
            variant === "dark"
              ? "text-foreground placeholder:text-foreground/60"
              : "text-foreground placeholder:text-muted-foreground"
          }`}
        />
      </form>
      {open && q.trim().length >= 2 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
        >
          {loading && <div className="px-4 py-3 text-xs text-muted-foreground">Buscando...</div>}
          {!loading && results.length === 0 && (
            <div className="px-4 py-4 text-sm text-muted-foreground text-center">
              Nenhum produto encontrado para <strong className="text-foreground">"{q}"</strong>.
              <br />
              <span className="text-xs">Tente outro termo ou veja todos os produtos.</span>
            </div>
          )}
          {results.map((p, i) => {
            const img = p.images.edges[0]?.node;
            return (
              <Link
                key={p.id}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                to="/produto/$handle"
                params={{ handle: p.handle }}
                onMouseEnter={() => setActive(i)}
                onClick={() => { setOpen(false); onNavigate?.(); }}
                className={`flex items-center gap-3 px-3 py-2 ${i === active ? "bg-secondary" : "hover:bg-secondary"}`}
              >
                {img ? (
                  <img src={img.url} alt={img.altText ?? p.title} loading="lazy" className="h-12 w-12 object-cover rounded shrink-0" />
                ) : (
                  <div className="h-12 w-12 bg-secondary rounded shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1 text-foreground">
                    <Highlight text={p.title} term={q} />
                  </p>
                  <p className="text-xs text-primary">
                    {formatPrice(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode)}
                  </p>
                </div>
              </Link>
            );
          })}
          {(results.length > 0 || (!loading && results.length === 0)) && (
            <button
              type="button"
              onClick={submit}
              className="w-full text-center text-xs font-semibold py-2.5 bg-secondary hover:bg-secondary/70"
            >
              Ver todos os resultados para "{q}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
