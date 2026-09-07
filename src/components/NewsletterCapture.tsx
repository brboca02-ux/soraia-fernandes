import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageCircle, Check } from "lucide-react";
import { track } from "@/lib/analytics";
import { cleanEmail, cleanPhone, isValidEmail, isValidPhone, saveLead } from "@/lib/leads";

export function NewsletterCapture({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cEmail = cleanEmail(email);
    const cPhone = cleanPhone(phone);
    if (!cEmail && !cPhone) {
      toast.error("Informe seu e-mail ou WhatsApp.");
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
    
    try {
      await saveLead({
        email: cEmail || undefined,
        whatsapp: cPhone || undefined,
        source: compact ? "footer" : "newsletter",
      });
      track.lead(cEmail && cPhone ? "email+whatsapp" : cEmail ? "email" : "whatsapp");
      setDone(true);
      toast.success("Cadastro confirmado", {
        description: "Você receberá nossos lançamentos e novidades em primeira mão.",
      });
    } catch (err) {
      toast.error("Erro ao realizar cadastro. Tente novamente.");
    }
  };



  if (done) {
    return (
      <div className={`text-center ${compact ? "" : "py-8"}`}>
        <Check className="mx-auto h-8 w-8 text-primary" strokeWidth={1.5} />
        <p className="font-display text-xl mt-3">Cadastro confirmado</p>
        <p className="text-sm text-muted-foreground mt-2">
          Você receberá nossos lançamentos em primeira mão.
        </p>
      </div>
    );
  }

  const emailId = `nl-email-${compact ? "footer" : "main"}`;
  const phoneId = `nl-phone-${compact ? "footer" : "main"}`;
  return (
    <form onSubmit={submit} className={compact ? "space-y-2" : "space-y-3"}>
      <div className="relative">
        <label htmlFor={emailId} className="sr-only">E-mail</label>
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          id={emailId}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          aria-label="E-mail"
          autoComplete="email"
          className="w-full bg-background border border-border rounded-md pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="relative">
        <label htmlFor={phoneId} className="sr-only">WhatsApp (opcional)</label>
        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          id={phoneId}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp (opcional)"
          aria-label="WhatsApp (opcional)"
          autoComplete="tel"
          className="w-full bg-background border border-border rounded-md pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-foreground text-background rounded-md py-2.5 text-sm font-semibold tracking-wide hover:bg-foreground/90 transition"
      >
        Quero receber novidades
      </button>
    </form>
  );
}

export function NewsletterSection() {
  return (
    <section className="section-compact bg-background border-t border-border">
      <div className="max-w-xl mx-auto px-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Newsletter Soraia Fernandes</p>
        <h2 className="font-display font-semibold text-3xl md:text-4xl mt-4 tracking-tight">
          Lançamentos em primeira mão
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
          Receba lançamentos, novidades e tendências da Soraia Fernandes direto no seu e-mail.
        </p>
        <div className="mt-8">
          <NewsletterCapture />
        </div>
      </div>
    </section>
  );
}
