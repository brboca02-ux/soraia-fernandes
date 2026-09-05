import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, Calendar, User, Phone, Ruler, Heart } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/shopify";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/alugar")({
  head: () => ({
    meta: [
      { title: "Aluguel de Vestidos — Soraia Fernandes" },
      {
        name: "description",
        content:
          "Alugue vestidos femininos exclusivos com Soraia Fernandes. Preencha o formulário e nossa equipe entrará em contato para encontrar o look perfeito para a sua ocasião.",
      },
      { property: "og:title", content: "Aluguel de Vestidos — Soraia Fernandes" },
      {
        property: "og:description",
        content: "Vestidos exclusivos para alugar. Casamentos, formaturas, festas e eventos especiais.",
      },
      { property: "og:url", content: "https://www.jesstorejoinville.com.br/alugar" },
    ],
    links: [{ rel: "canonical", href: "https://www.jesstorejoinville.com.br/alugar" }],
  }),
  component: AlugarPage,
});

const OCASIOES = [
  "Casamento",
  "Formatura",
  "Festa de 15 anos",
  "Festa de 18 anos",
  "Baile",
  "Jantar formal",
  "Outro evento",
];

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG"];

interface FormData {
  nome: string;
  telefone: string;
  email: string;
  ocasiao: string;
  dataEvento: string;
  tamanho: string;
  altura: string;
  observacoes: string;
}

const empty: FormData = {
  nome: "",
  telefone: "",
  email: "",
  ocasiao: "",
  dataEvento: "",
  tamanho: "",
  altura: "",
  observacoes: "",
};

function AlugarPage() {
  const [form, setForm] = useState<FormData>(empty);
  const [enviado, setEnviado] = useState(false);

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const whatsappLink = () => {
    const msg = [
      `Olá, Soraia! Quero alugar um vestido. 👗`,
      ``,
      `*Nome:* ${form.nome}`,
      `*Telefone:* ${form.telefone}`,
      form.email ? `*E-mail:* ${form.email}` : null,
      `*Ocasião:* ${form.ocasiao}`,
      `*Data do evento:* ${form.dataEvento}`,
      `*Tamanho:* ${form.tamanho}`,
      form.altura ? `*Altura:* ${form.altura} cm` : null,
      form.observacoes ? `*Observações:* ${form.observacoes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return buildWhatsAppLink(msg);
  };

  const isValid =
    form.nome.trim() &&
    form.telefone.trim() &&
    form.ocasiao &&
    form.dataEvento &&
    form.tamanho;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    window.open(whatsappLink(), "_blank", "noopener,noreferrer");
    setEnviado(true);
  };

  return (
    <div className="bg-background min-h-screen">
      <Breadcrumbs
        items={[
          { name: "Início", href: "/" },
          { name: "Alugar Vestido", href: "/alugar" },
        ]}
      />

      {/* Hero */}
      <section className="bg-black text-white py-14 md:py-20 text-center px-6">
        <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gold mb-3">
          Soraia Fernandes
        </p>
        <h1 className="font-display font-bold text-4xl md:text-6xl tracking-tight mb-4">
          Aluguel de Vestidos
        </h1>
        <p className="text-base md:text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
          Vestidos exclusivos para os momentos mais especiais da sua vida. Preencha o formulário e
          entramos em contato para encontrar o look perfeito para você.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/60">
          <span className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-gold" /> Casamentos
          </span>
          <span className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-gold" /> Formaturas
          </span>
          <span className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-gold" /> Festas & Eventos
          </span>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        {enviado ? (
          <div className="text-center space-y-5 py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#25D366]/10 mx-auto">
              <MessageCircle className="h-8 w-8 text-[#25D366]" />
            </div>
            <h2 className="font-display text-3xl">Solicitação enviada!</h2>
            <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Você foi redirecionada para o WhatsApp com todas as suas informações. Responderemos em breve!
            </p>
            <Button
              onClick={() => setEnviado(false)}
              variant="outline"
              className="rounded-none border-gold text-gold hover:bg-gold hover:text-primary-foreground"
            >
              Fazer nova solicitação
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-1">
                Solicitar Aluguel
              </h2>
              <p className="text-sm text-muted-foreground">
                Preencha os campos abaixo e você será redirecionada para o nosso WhatsApp com tudo preenchido.
              </p>
            </div>

            {/* Dados pessoais */}
            <div className="rounded-xl border border-border bg-background p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Seus dados
              </h3>
              <Field label="Nome completo *">
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Seu nome"
                  required
                  className={input}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="WhatsApp *">
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={(e) => set("telefone", e.target.value)}
                    placeholder="(47) 99999-9999"
                    required
                    className={input}
                  />
                </Field>
                <Field label="E-mail (opcional)">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="seu@email.com"
                    className={input}
                  />
                </Field>
              </div>
            </div>

            {/* Evento */}
            <div className="rounded-xl border border-border bg-background p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Sobre o evento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ocasião *">
                  <select
                    value={form.ocasiao}
                    onChange={(e) => set("ocasiao", e.target.value)}
                    required
                    className={input}
                  >
                    <option value="">Selecione...</option>
                    {OCASIOES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data do evento *">
                  <input
                    type="date"
                    value={form.dataEvento}
                    onChange={(e) => set("dataEvento", e.target.value)}
                    required
                    className={input}
                  />
                </Field>
              </div>
            </div>

            {/* Medidas */}
            <div className="rounded-xl border border-border bg-background p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5" /> Suas medidas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tamanho *">
                  <select
                    value={form.tamanho}
                    onChange={(e) => set("tamanho", e.target.value)}
                    required
                    className={input}
                  >
                    <option value="">Selecione...</option>
                    {TAMANHOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Altura (opcional)">
                  <input
                    type="number"
                    value={form.altura}
                    onChange={(e) => set("altura", e.target.value)}
                    placeholder="Ex: 165"
                    min={140}
                    max={200}
                    className={input}
                  />
                </Field>
              </div>
              <Field label="Observações (opcional)">
                <textarea
                  value={form.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                  placeholder="Cor preferida, estilo, referências, alguma restrição..."
                  rows={3}
                  className={input}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={!isValid}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-none font-bold text-sm tracking-widest uppercase hover:bg-[#22c55e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Enviar pelo WhatsApp
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Você será redirecionada para o WhatsApp com suas informações preenchidas automaticamente.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
