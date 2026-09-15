import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Clock } from "lucide-react";
import { ProductGrid } from "@/components/ProductGrid";

// Configure aqui a data/hora de término da campanha (UTC ou local)
// Ex.: domingo às 23:59 dessa semana
function getNextSundayEnd(): Date {
  const now = new Date();
  const d = new Date(now);
  const diff = (7 - now.getDay()) % 7;
  d.setDate(now.getDate() + diff);
  d.setHours(23, 59, 59, 0);
  return d;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target.getTime() - now);
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function Cell({ n, l }: { n: number; l: string }) {
  return (
    <div className="bg-white/15 rounded-md px-3 py-2 text-center min-w-[58px]">
      <div className="font-display font-bold text-xl md:text-2xl tabular-nums">{String(n).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{l}</div>
    </div>
  );
}

export function PromoCountdownBanner() {
  const target = getNextSundayEnd();
  const t = useCountdown(target);
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center md:text-left">
          <Flame className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-display font-bold text-lg leading-tight">Ofertas da Semana</p>
            <p className="text-xs opacity-90">Aproveite descontos exclusivos até domingo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 mr-1 opacity-80" />
          <Cell n={t.d} l="dias" />
          <Cell n={t.h} l="hrs" />
          <Cell n={t.m} l="min" />
          <Cell n={t.s} l="seg" />
        </div>
        <Link
          to="/colecao"
          search={{ c: "promocoes" }}
          className="bg-gold text-gold-foreground font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90"
        >
          Ver ofertas →
        </Link>
      </div>
    </section>
  );
}

export function RecebidosSection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <span className="eyebrow">Acabou de chegar</span>
            <h2 className="font-display text-3xl md:text-5xl mt-3">Recebidos da Semana</h2>
            <span className="gold-rule mt-4" />
          </div>
          <Link to="/colecao" search={{ c: "novidades" }} className="hidden sm:inline-block text-sm font-semibold text-primary hover:underline">
            Ver tudo →
          </Link>
        </div>
        <ProductGrid first={8} sortKey="CREATED_AT" reverse={true} />
      </div>
    </section>
  );
}
