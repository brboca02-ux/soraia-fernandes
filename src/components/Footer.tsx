import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, MapPin, ShieldCheck, Lock } from "lucide-react";
import { NewsletterCapture } from "@/components/NewsletterCapture";
import { STORE_INFO, buildWhatsAppLink } from "@/lib/shopify";
import { BrandLogo } from "@/components/BrandLogo";

const COL_TITLE = "text-[11px] tracking-[0.3em] uppercase mb-5 text-foreground/60";
const LINK = "inline-flex items-center min-h-11 py-2 text-sm text-foreground/75 hover:text-background transition";

export function Footer() {
  return (
    <footer className="bg-background text-foreground mt-16 md:mt-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 md:py-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12">
        {/* Brand + Newsletter */}
        <div className="lg:col-span-2">
          <Link to="/" aria-label="Soraia Fernandes Moda Festa" className="inline-flex">
            <BrandLogo className="h-auto w-64 md:w-72" />
          </Link>
          <p className="text-sm text-foreground/70 mt-5 leading-relaxed max-w-sm">
            Vestidos exclusivos para os momentos mais especiais. Aluguel e venda de moda festa em Joinville/SC.
          </p>
          <div className="mt-7 max-w-sm">
            <p className={COL_TITLE}>Newsletter</p>
            <p className="text-sm text-foreground/70 mb-4">
              Receba lançamentos, novidades e tendências em primeira mão.
            </p>
            <div className="bg-secondary text-secondary-foreground rounded-md p-4">
              <NewsletterCapture compact />
            </div>
          </div>
        </div>

        <div>
          <h3 className={COL_TITLE}>Institucional</h3>
          <ul className="space-y-3">
            <li><Link to="/sobre" className={LINK}>Sobre Nós</Link></li>
            <li><a href="#loja" className={LINK}>Nossa Loja</a></li>
            <li>
              <a href={buildWhatsAppLink("Olá! Vim pelo site da Soraia Fernandes e gostaria de falar com vocês.")} target="_blank" rel="noopener noreferrer" className={LINK}>
                Contato
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className={COL_TITLE}>Atendimento</h3>
          <ul className="space-y-3">
            <li><Link to="/trocas-e-devolucoes" className={LINK}>Trocas e Devoluções</Link></li>
            <li><Link to="/privacidade" className={LINK}>Política de Privacidade</Link></li>
            <li><Link to="/termos" className={LINK}>Termos de Uso</Link></li>
            <li><Link to="/trocas-e-devolucoes" className={LINK}>Política de Entrega</Link></li>
          </ul>
        </div>

        <div>
          <h3 className={COL_TITLE}>Contato</h3>
          <ul className="space-y-3">
            <li>
              <a href={buildWhatsAppLink("Olá Soraia Fernandes!")} target="_blank" rel="noopener noreferrer" className={`${LINK} inline-flex items-center gap-2`}>
                <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> WhatsApp
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/soraiafernandesmodafesta/" target="_blank" rel="noopener noreferrer" className={`${LINK} inline-flex items-center gap-2`}>
                <Instagram className="h-4 w-4" strokeWidth={1.5} /> Instagram
              </a>
            </li>
            <li className={`${LINK} flex items-start gap-2`}>
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
              <span>
                {STORE_INFO.street}<br />
                {STORE_INFO.city}/{STORE_INFO.region} · CEP {STORE_INFO.postalCode}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Trust + payments */}
      <div className="border-t border-background/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-foreground/70 list-none">
            <li className="inline-flex items-center gap-2"><Lock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" /> Site Seguro</li>
            <li className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" /> Compra Segura</li>
            <li className="inline-flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" /> Atendimento via WhatsApp</li>
          </ul>
          <ul aria-label="Formas de pagamento aceitas" className="flex flex-wrap items-center gap-2 list-none">
            {["Pix", "Visa", "Mastercard", "Elo", "Amex", "Hipercard"].map((m) => (
              <li key={m}><PayBadge label={`Aceitamos ${m}`}>{m}</PayBadge></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-background/10 py-6 text-center text-xs text-foreground/55 px-6">
        <p>
          Soraia Fernandes · {STORE_INFO.street}, {STORE_INFO.city}/{STORE_INFO.region} · CEP {STORE_INFO.postalCode}
        </p>
        <p className="mt-1">© {new Date().getFullYear()} Soraia Fernandes. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

function PayBadge({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <span
      role="img"
      aria-label={label ?? (typeof children === "string" ? `Aceitamos ${children}` : undefined)}
      className="text-[10px] font-semibold tracking-wider uppercase bg-background/10 border border-background/15 text-foreground/85 px-2.5 py-1 rounded"
    >
      {children}
    </span>
  );
}
