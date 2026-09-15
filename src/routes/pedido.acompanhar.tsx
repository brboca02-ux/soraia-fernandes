import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Search, Package } from "lucide-react";
import { getOrderPublic } from "@/lib/api/orderTracking";
import { toast } from "sonner";

export const Route = createFileRoute("/pedido/acompanhar")({
  head: () => ({
    meta: [
      { title: "Acompanhar pedido — Soraia Fernandes" },
      { name: "description", content: "Consulte o status do seu pedido Soraia Fernandes em tempo real." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const navigate = useNavigate();
  const [numero, setNumero] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = numero.trim();
    const mail = email.trim().toLowerCase();
    if (!num || !mail) {
      toast.error("Informe o número do pedido e o e-mail.");
      return;
    }
    setLoading(true);
    try {
      const found = await getOrderPublic(num, mail);
      if (!found) {
        toast.error("Pedido não encontrado ou e-mail não confere.");
        return;
      }
      navigate({
        to: "/pedido/sucesso/$numero",
        params: { numero: found.order_number },
        search: { email: mail },
      });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível consultar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <Package className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl">Acompanhar pedido</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Informe o número do pedido e o e-mail usado na compra.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="numero" className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
            Número do pedido
          </label>
          <input
            id="numero"
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="ex.: MD-000123"
            className="w-full h-11 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
            E-mail da compra
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="w-full h-11 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-md text-sm font-semibold hover:bg-foreground/90 disabled:opacity-60 transition"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Consultando..." : "Ver status"}
        </button>
      </form>

      <p className="text-center mt-6">
        <Link to="/" className="inline-flex items-center min-h-11 px-3 text-xs text-primary hover:underline">← Voltar para a loja</Link>
      </p>
    </div>
  );
}
