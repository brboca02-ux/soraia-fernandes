import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductForm } from "@/components/ProductForm";
import { useProductsStore } from "@/stores/productsStore";

export const Route = createFileRoute("/produtos/$id/editar")({
  head: () => ({ meta: [{ title: "Editar Produto — Soraia Fernandes" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const product = useProductsStore((s) => s.products.find((p) => p.id === id));
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Produto não encontrado.</p>
          <Link to="/produtos" className="text-primary font-medium hover:underline">Voltar para produtos</Link>
        </div>
      </div>
    );
  }
  return <ProductForm productId={id} />;
}
