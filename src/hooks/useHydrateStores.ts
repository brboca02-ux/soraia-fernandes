import { useEffect } from "react";
import { useProductsStore } from "@/stores/productsStore";
import { useCategoriesStore } from "@/stores/categoriesStore";
import { useStockStore } from "@/stores/stockStore";

/**
 * Carrega produtos, categorias e movimentações de estoque do Supabase
 * no primeiro mount. Garante que vitrine e painel admin compartilhem
 * a mesma fonte de dados.
 */
export function useHydrateStores() {
  useEffect(() => {
    void useProductsStore.getState().hydrate();
    void useCategoriesStore.getState().hydrate();
    void useStockStore.getState().hydrate();
  }, []);
}
