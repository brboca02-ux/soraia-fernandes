import { createFileRoute } from "@tanstack/react-router";
import { ProductRegistration } from "@/components/ProductRegistration";

export const Route = createFileRoute("/produtos/novo")({
  head: () => ({ meta: [
    { title: "Cadastrar Roupa — Painel Soraia Fernandes" },
    { name: "description", content: "Cadastre roupas reais com foto, categoria, preço e estoque no painel da Soraia Fernandes." },
    { property: "og:title", content: "Cadastrar Roupa — Painel Soraia Fernandes" },
    { property: "og:description", content: "Cadastro de roupas no painel da Soraia Fernandes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: ProductRegistration,
});
