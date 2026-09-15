import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/produtos/novo")({
  head: () => ({ meta: [{ title: "Novo Produto — Soraia Fernandes" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <ProductForm />,
});
