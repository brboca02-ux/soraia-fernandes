import { createFileRoute } from "@tanstack/react-router";
import { CategoryForm } from "@/components/CategoryForm";

export const Route = createFileRoute("/categorias/novo")({
  head: () => ({ meta: [{ title: "Nova Categoria — Soraia Fernandes" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <CategoryForm />,
});
