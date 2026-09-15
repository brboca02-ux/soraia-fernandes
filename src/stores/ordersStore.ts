import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import { listMyOrders, type OrderFull } from "@/lib/api/supaOrders";

export const STORE_ID = "store_js_store";

export type OrderStatus =
  | "novo"
  | "pago"
  | "separando"
  | "enviado"
  | "entregue"
  | "cancelado";

export type PaymentStatus = "pendente" | "pago" | "estornado" | "falhou";
export type PaymentMethod = "pix" | "cartao" | "boleto" | "whatsapp" | "manual";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "novo", "pago", "separando", "enviado", "entregue",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  novo: "Novo",
  pago: "Pago",
  separando: "Separando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
}

export interface OrderAddress {
  name: string;
  zip: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  doc?: string;
}

export interface OrderHistoryEntry {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  user_id: string;
  note?: string;
  created_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  number: string;
  customer: OrderCustomer;
  address: OrderAddress;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items: OrderItem[];
  history: OrderHistoryEntry[];
  notes?: string;
  created_at: string;
  paid_at?: string | null;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const today = new Date();
const daysAgo = (d: number) => new Date(today.getTime() - d * 86400000).toISOString();

const mkOrder = (
  n: number,
  status: OrderStatus,
  payment: PaymentStatus,
  customer: OrderCustomer,
  items: Omit<OrderItem, "id" | "order_id">[],
  shipping = 19.9,
  discount = 0,
  daysOffset = 0,
): Order => {
  const id = "o_" + uid();
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const total = subtotal + shipping - discount;
  const created_at = daysAgo(daysOffset);
  return {
    id,
    store_id: STORE_ID,
    number: "#" + (1000 + n),
    customer,
    address: {
      name: customer.name,
      zip: "89010-000",
      street: "Rua das Flores",
      number: String(100 + n),
      district: "Centro",
      city: "Blumenau",
      state: "SC",
    },
    status,
    payment_status: payment,
    payment_method: "pix",
    subtotal,
    shipping,
    discount,
    total,
    items: items.map((i) => ({ ...i, id: uid(), order_id: id })),
    history: [
      {
        id: uid(), order_id: id, old_status: null, new_status: "novo",
        user_id: "admin", created_at,
      },
      ...(status !== "novo" ? [{
        id: uid(), order_id: id, old_status: "novo" as OrderStatus,
        new_status: status, user_id: "admin", created_at,
      }] : []),
    ],
    created_at,
  };
};

const seed: Order[] = [];

// ---- Mapeamento DB -> shape local usado pelo admin ---------------------
type DbFulfillment = "novo" | "separando" | "enviado" | "entregue" | null | undefined;

function mapDbToLocal(o: OrderFull): Order {
  const fulfillment = (o as unknown as { fulfillment_status?: DbFulfillment }).fulfillment_status;
  const status: OrderStatus =
    o.status === "cancelado"
      ? "cancelado"
      : o.status === "pago"
        ? (fulfillment && ["separando", "enviado", "entregue"].includes(fulfillment)
            ? (fulfillment as OrderStatus)
            : "pago")
        : "novo";
  const payment_status: PaymentStatus =
    o.status === "pago" || fulfillment === "separando" || fulfillment === "enviado" || fulfillment === "entregue"
      ? "pago"
      : o.status === "cancelado"
        ? "estornado"
        : "pendente";
  const pm = (o.payment_method ?? "manual") as PaymentMethod;
  return {
    id: o.id,
    store_id: STORE_ID,
    number: o.order_number,
    customer: {
      id: o.customer?.id ?? "",
      name: o.customer?.name ?? "",
      email: o.customer?.email ?? "",
      phone: o.customer?.phone ?? "",
      doc: o.customer?.cpf ?? undefined,
    },
    address: {
      name: o.customer?.name ?? "",
      zip: o.address?.cep ?? "",
      street: o.address?.street ?? "",
      number: o.address?.number ?? "",
      complement: o.address?.complement ?? undefined,
      district: o.address?.district ?? "",
      city: o.address?.city ?? "",
      state: o.address?.state ?? "",
    },
    status,
    payment_status,
    payment_method: pm,
    subtotal: o.subtotal,
    shipping: o.shipping_cost,
    discount: o.discount,
    total: o.total,
    items: o.items.map((i) => ({
      id: i.id,
      order_id: o.id,
      product_id: "",
      variant_id: null,
      name: i.product_name,
      sku: "",
      size: i.variant_size ?? undefined,
      color: i.variant_color ?? undefined,
      quantity: i.quantity,
      price: i.unit_price,
    })),
    history: [],
    notes: o.notes ?? undefined,
    created_at: o.created_at,
    paid_at: o.paid_at ?? null,
  };
}


interface OrdersState {
  orders: Order[];
  hydrated: boolean;
  list: () => Order[];
  get: (id: string) => Order | undefined;
  setStatus: (id: string, status: OrderStatus, user_id?: string, note?: string) => void;
  cancel: (id: string, user_id?: string, note?: string) => void;
  remove: (id: string) => void;
  hydrate: () => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: seed,
      hydrated: false,
      list: () => get().orders,
      get: (id) => get().orders.find((o) => o.id === id),
      setStatus: (id, status, user_id = "admin", note) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== id || o.status === status) return o;
            const entry: OrderHistoryEntry = {
              id: uid(), order_id: id, old_status: o.status, new_status: status,
              user_id, note, created_at: new Date().toISOString(),
            };
            const payment_status: PaymentStatus =
              status === "pago" || status === "separando" || status === "enviado" || status === "entregue"
                ? "pago"
                : status === "cancelado" ? "estornado" : o.payment_status;
            return { ...o, status, payment_status, history: [...o.history, entry] };
          }),
        })),
      cancel: (id, user_id = "admin", note) => get().setStatus(id, "cancelado", user_id, note),
      remove: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),

      // Puxa pedidos reais do Supabase (respeitando RLS do admin logado).
      hydrate: async () => {
        try {
          const rows = await listMyOrders();
          const orders = rows.map(mapDbToLocal);
          set({ orders, hydrated: true });
        } catch (e) {
          console.warn("orders hydrate:", e);
        }
      },

      // Realtime: qualquer INSERT/UPDATE em orders recarrega a lista.
      // Isso garante que o webhook do MP refletir mudanças no admin
      // sem precisar dar refresh na página.
      subscribeRealtime: () => {
        const channel = supabase
          .channel("orders-admin")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders" },
            () => { void get().hydrate(); },
          )
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      },
    }),
    { name: "md_orders_v2", storage: createJSONStorage(() => localStorage), partialize: (s) => ({ orders: s.orders }) },
  ),
);


export const statusTone: Record<OrderStatus, string> = {
  novo: "bg-slate-100 text-slate-700 ring-slate-200",
  pago: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  separando: "bg-amber-50 text-amber-700 ring-amber-200",
  enviado: "bg-blue-50 text-blue-700 ring-blue-200",
  entregue: "bg-violet-50 text-violet-700 ring-violet-200",
  cancelado: "bg-rose-50 text-rose-700 ring-rose-200",
};
