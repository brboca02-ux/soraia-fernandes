import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { listMyOrders } from "@/lib/api/supaOrders";
import { formatPrice } from "@/lib/shopify";

export const Route = createFileRoute("/_authenticated/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus Pedidos — Soraia Fernandes" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MyOrdersPage,
});

const statusLabel: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  separando: "Separando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function MyOrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["my-orders"], queryFn: listMyOrders });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl">Meus pedidos</h1>
      <p className="text-sm text-muted-foreground mt-1">Acompanhe suas compras.</p>

      <div className="mt-8 space-y-3">
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="border border-dashed border-border rounded-md p-10 text-center text-sm text-muted-foreground">
            Você ainda não tem pedidos.{" "}
            <Link to="/" className="text-primary hover:underline">Ir para a loja</Link>
          </div>
        )}
        {data?.map((o) => (
          <Link
            key={o.id}
            to="/pedido/sucesso/$numero"
            params={{ numero: o.order_number }}
            className="block border border-border rounded-md p-4 hover:bg-secondary/30 transition"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <p className="font-semibold">{o.order_number}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatPrice(o.total, "BRL")}</p>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{statusLabel[o.status] ?? o.status}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
