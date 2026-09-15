import { create } from "zustand";
import { STORE_ID, useProductsStore } from "./productsStore";
import { listMovements, recordMovementRemote } from "@/lib/api/supaProducts";

export type MovementType = "entrada" | "saida" | "ajuste";

export interface StockMovement {
  id: string; store_id: string;
  product_id: string; product_name: string;
  type: MovementType; quantity: number;
  reason: string; notes: string;
  user_id: string; user_name: string;
  created_at: string;
}

interface StockState {
  movements: StockMovement[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  list: () => StockMovement[];
  record: (input: {
    product_id: string; type: MovementType; quantity: number;
    reason: string; notes?: string;
  }) => Promise<StockMovement | undefined>;
}

let inflight: Promise<void> | null = null;

export const useStockStore = create<StockState>((set, get) => ({
  movements: [],
  loaded: false,

  hydrate: async () => {
    if (get().loaded) return;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const ms = await listMovements();
        set({ movements: ms.map((m) => ({ ...m, store_id: STORE_ID, user_id: m.user_id ?? "" })), loaded: true });
      } catch { /* tabela ainda não criada */ }
      finally { inflight = null; }
    })();
    return inflight;
  },

  refresh: async () => {
    try {
      const ms = await listMovements();
      set({ movements: ms.map((m) => ({ ...m, store_id: STORE_ID, user_id: m.user_id ?? "" })), loaded: true });
    } catch { /* ignore */ }
  },

  list: () => get().movements.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),

  record: async ({ product_id, type, quantity, reason, notes }) => {
    const prodStore = useProductsStore.getState();
    const product = prodStore.get(product_id);
    if (!product) return undefined;

    let signedQty = 0;
    if (type === "entrada") {
      signedQty = Math.abs(quantity);
      await prodStore.adjustStock(product_id, signedQty);
    } else if (type === "saida") {
      signedQty = -Math.abs(quantity);
      await prodStore.adjustStock(product_id, signedQty);
    } else {
      signedQty = Math.max(0, quantity);
      await prodStore.setStock(product_id, signedQty);
    }

    const remote = await recordMovementRemote({
      product_id, product_name: product.name, type, quantity: signedQty,
      reason: reason || "—", notes: notes || "",
    });
    const m: StockMovement = {
      ...remote, store_id: STORE_ID, user_id: remote.user_id ?? "",
    };
    set((s) => ({ movements: [m, ...s.movements] }));
    return m;
  },
}));
