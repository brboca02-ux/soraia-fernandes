import { createFileRoute, Link } from "@tanstack/react-router";
import { CategoryForm } from "@/components/CategoryForm";
import { useCategoriesStore } from "@/stores/categoriesStore";

export const Route = createFileRoute("/categorias/$id/editar")({
  head: () => ({ meta: [{ title: "Editar Categoria — Soraia Fernandes" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const cat = useCategoriesStore((s) => s.categories.find((c) => c.id === id));
  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Categoria não encontrada.</p>
          <Link to="/categorias" className="text-primary font-medium hover:underline">Voltar</Link>
        </div>
      </div>
    );
  }
  return <CategoryForm categoryId={id} />;
}
