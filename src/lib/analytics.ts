// Lightweight analytics helper for GA4 + Meta Pixel.
// Safely no-ops when the IDs are not configured.
type Params = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const hasGA = () => typeof window !== "undefined" && typeof window.gtag === "function";
const hasPixel = () => typeof window !== "undefined" && typeof window.fbq === "function";

function ga(event: string, params?: Params) {
  if (hasGA()) window.gtag!("event", event, params ?? {});
}
function pixel(event: string, params?: Params, custom = false, eventID?: string) {
  if (!hasPixel()) return;
  if (eventID) window.fbq!(custom ? "trackCustom" : "track", event, params ?? {}, { eventID });
  else window.fbq!(custom ? "trackCustom" : "track", event, params ?? {});
}

// Dedup guard (per page load) to prevent double-fires of the same event.
const recentEvents = new Map<string, number>();
function isDuplicate(name: string, key: string, windowMs = 1500): boolean {
  const k = `${name}:${key}`;
  const now = Date.now();
  const last = recentEvents.get(k) ?? 0;
  if (now - last < windowMs) return true;
  recentEvents.set(k, now);
  return false;
}

export function genEventId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* noop */ }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const track = {
  viewItem(p: { id: string; name: string; price: number; currency?: string }) {
    ga("view_item", {
      currency: p.currency ?? "BRL",
      value: p.price,
      items: [{ item_id: p.id, item_name: p.name, price: p.price }],
    });
    pixel("ViewContent", { content_ids: [p.id], content_name: p.name, value: p.price, currency: p.currency ?? "BRL" });
  },
  addToCart(p: { id: string; name: string; price: number; quantity?: number; currency?: string }) {
    const qty = p.quantity ?? 1;
    ga("add_to_cart", {
      currency: p.currency ?? "BRL",
      value: p.price * qty,
      items: [{ item_id: p.id, item_name: p.name, price: p.price, quantity: qty }],
    });
    pixel("AddToCart", { content_ids: [p.id], content_name: p.name, value: p.price * qty, currency: p.currency ?? "BRL" });
  },
  beginCheckout(p: { value: number; currency?: string; items?: Array<{ id: string; name: string; price: number; quantity: number }> }) {
    const currency = p.currency ?? "BRL";
    const value = Math.round(p.value * 100) / 100;
    const ids = p.items?.map((i) => i.id) ?? [];
    const numItems = p.items?.reduce((a, b) => a + b.quantity, 0) ?? 0;
    // Dedup key = snapshot do carrinho (ids+qty+valor). Evita double-fire.
    const key = `${value}|${numItems}|${ids.join(",")}`;
    if (isDuplicate("begin_checkout", key)) return;

    ga("begin_checkout", {
      currency,
      value,
      items: p.items?.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
    });
    const eventID = genEventId();
    pixel(
      "InitiateCheckout",
      {
        value,
        currency,
        content_ids: ids,
        content_type: "product",
        num_items: numItems,
        contents: p.items?.map((i) => ({ id: i.id, quantity: i.quantity, item_price: i.price })),
      },
      false,
      eventID,
    );
    // Guardado pra futura Conversion API (server-side) reusar o mesmo eventID pra dedup.
    try {
      if (typeof window !== "undefined") {
        (window as unknown as { __lastInitiateCheckout?: unknown }).__lastInitiateCheckout = {
          eventID, value, currency, content_ids: ids, num_items: numItems, ts: Date.now(),
        };
      }
    } catch { /* noop */ }
  },
  purchase(p: { value: number; currency?: string; transactionId?: string }) {
    ga("purchase", { transaction_id: p.transactionId, value: p.value, currency: p.currency ?? "BRL" });
    pixel("Purchase", { value: p.value, currency: p.currency ?? "BRL" });
  },
  search(query: string) {
    ga("search", { search_term: query });
    pixel("Search", { search_string: query });
  },
  whatsappClick(source: string) {
    ga("whatsapp_click", { source });
    pixel("Contact", { source }, true);
  },
  lead(source: string) {
    ga("generate_lead", { source });
    pixel("Lead", { source });
  },
  popupView(name: string) {
    ga("popup_view", { popup: name });
    pixel("PopupView", { popup: name }, true);
  },
  exitIntentView() {
    ga("exit_intent_view");
    pixel("ExitIntentView", {}, true);
  },
};
