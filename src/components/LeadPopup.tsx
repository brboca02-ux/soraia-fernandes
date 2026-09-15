import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  cleanEmail,
  cleanPhone,
  hasAnyLead,
  isValidEmail,
  isValidPhone,
  saveLead,
  type LeadSource,
} from "@/lib/leads";

const WELCOME_DISMISSED_KEY = "md_welcome_popup_dismissed_at";
const EXIT_DISMISSED_KEY = "md_exit_popup_dismissed_at";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function recentlyDismissed(key: string) {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  return Date.now() - Number(raw) < SEVEN_DAYS;
}

function markDismissed(key: string) {
  localStorage.setItem(key, String(Date.now()));
}

export function LeadPopup() {
  const [active, setActive] = useState<null | { source: LeadSource; title: string; intro: string }>(null);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [exitShown, setExitShown] = useState(false);

  // ---- Welcome popup (timer OR 30% scroll) ----
  useEffect(() => {
    if (welcomeShown) return;
    if (hasAnyLead() || recentlyDismissed(WELCOME_DISMISSED_KEY)) {
      setWelcomeShown(true);
      return;
    }

    const open = () => {
      if (welcomeShown) return;
      setWelcomeShown(true);
      setActive({
        source: "welcome_popup",
        title: "Bem-vinda à Soraia Fernandes",
        intro: "Receba lançamentos, novidades e ofertas exclusivas.",
      });
      track.popupView("welcome");
    };

    const delay = 9000 + Math.random() * 3000;
    const timer = window.setTimeout(open, delay);

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (max > 0 && doc.scrollTop / max >= 0.3) open();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [welcomeShown]);

  // ---- Exit intent (desktop: mouseleave top; mobile: 45s timer) ----
  useEffect(() => {
    if (exitShown) return;
    if (hasAnyLead() || recentlyDismissed(EXIT_DISMISSED_KEY)) {
      setExitShown(true);
      return;
    }

    const open = () => {
      if (exitShown || active) return;
      setExitShown(true);
      setActive({
        source: "exit_intent",
        title: "Espere! Antes de ir...",
        intro: "Receba nossas novidades e promoções exclusivas.",
      });
      track.exitIntentView();
    };

    const isMobile = window.matchMedia("(pointer: coarse)").matches;
    let timer: number | undefined;
    let onLeave: ((e: MouseEvent) => void) | undefined;

    if (isMobile) {
      timer = window.setTimeout(open, 45000);
    } else {
      onLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) open();
      };
      document.addEventListener("mouseleave", onLeave);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      if (onLeave) document.removeEventListener("mouseleave", onLeave);
    };
  }, [exitShown, active]);

  if (!active) return null;

  const close = () => {
    const key = active.source === "welcome_popup" ? WELCOME_DISMISSED_KEY : EXIT_DISMISSED_KEY;
    markDismissed(key);
    setActive(null);
  };

  return <LeadModal title={active.title} intro={active.intro} source={active.source} onClose={close} />;
}

function LeadModal({
  title,
  intro,
  source,
  onClose,
}: {
  title: string;
  intro: string;
  source: LeadSource;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cName = name.trim().slice(0, 80);
    const cEmail = cleanEmail(email);
    const cPhone = cleanPhone(whatsapp);

    if (!cEmail && !cPhone) {
      toast.error("Informe seu WhatsApp ou e-mail.");
      return;
    }
    if (cEmail && !isValidEmail(cEmail)) {
      toast.error("E-mail inválido.");
      return;
    }
    if (cPhone && !isValidPhone(cPhone)) {
      toast.error("WhatsApp inválido.");
      return;
    }

    setSubmitting(true);
    saveLead({
      name: cName || undefined,
      email: cEmail || undefined,
      whatsapp: cPhone || undefined,
      source,
      created_at: new Date().toISOString(),
    });
    track.lead(source);
    markDismissed(source === "welcome_popup" ? "md_welcome_popup_dismissed_at" : "md_exit_popup_dismissed_at");
    toast.success("Cadastro confirmado", {
      description: "Você receberá nossos lançamentos em primeira mão.",
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-popup-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-background rounded-lg shadow-2xl p-7 sm:p-9 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex justify-center mb-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" strokeWidth={1.5} />
          </span>
        </div>

        <h2 id="lead-popup-title" className="font-display text-2xl text-center text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-center text-muted-foreground">{intro}</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            aria-label="Nome"
            autoComplete="name"
            maxLength={80}
            className="w-full border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp"
            aria-label="WhatsApp"
            autoComplete="tel"
            maxLength={20}
            className="w-full border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            aria-label="E-mail"
            autoComplete="email"
            maxLength={254}
            className="w-full border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-semibold tracking-wide hover:bg-primary/90 transition disabled:opacity-60"
          >
            {source === "welcome_popup" ? "Quero receber novidades" : "Receber novidades"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition py-1"
          >
            {source === "welcome_popup" ? "Talvez depois" : "Continuar navegando"}
          </button>
        </form>
      </div>
    </div>
  );
}
