import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, Clock, XCircle, ShoppingBag, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  formatPrice,
  buildCustomerWhatsAppLink,
  buildOrderPaidMessage,
} from "@/lib/shopify";

interface NotifRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  paid_at: string | null;
  created_at: string;
  customer: { name: string | null; phone: string | null; email: string | null } | null;
}

/** Abre o WhatsApp pré-preenchido para avisar o cliente que o pagamento foi confirmado. */
function openPaidWhatsApp(r: NotifRow) {
  const phone = r.customer?.phone ?? "";
  if (!phone) {
    toast.error("Cliente sem telefone cadastrado.", {
      description: "Não é possível enviar WhatsApp direto sem o número.",
    });
    return;
  }
  const trackingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pedido/sucesso/${r.order_number}${
          r.customer?.email ? `?email=${encodeURIComponent(r.customer.email)}` : ""
        }`
      : `/pedido/sucesso/${r.order_number}`;
  const msg = buildOrderPaidMessage({
    customerName: r.customer?.name,
    orderNumber: r.order_number,
    total: r.total,
    trackingUrl,
  });
  window.open(buildCustomerWhatsAppLink(phone, msg), "_blank", "noopener");
}

const LS_KEY = "mdm_admin_notif_lastread";

function statusMeta(s: string) {
  switch (s) {
    case "pago":
      return { label: "Pago", Icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "cancelado":
    case "estornado":
    case "falhou":
      return { label: s === "estornado" ? "Estornado" : "Falhou", Icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" };
    default:
      return { label: "Aguardando", Icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" };
  }
}

function eventTime(r: NotifRow): string {
  return r.paid_at ?? r.created_at;
}

export function AdminNotificationsBell() {
  const [rows, setRows] = useState<NotifRow[]>([]);
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState<string>(() => {
    if (typeof window === "undefined") return new Date(0).toISOString();
    return window.localStorage.getItem(LS_KEY) ?? new Date(0).toISOString();
  });
  const seenIdsRef = useRef<Set<string>>(new Set());

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, total, paid_at, created_at, customer:customers(name, phone, email)")
      .order("created_at", { ascending: false })
      .limit(25);
    const list = (data ?? []) as unknown as NotifRow[];
    setRows(list);
    list.forEach((r) => seenIdsRef.current.add(r.id));
  }

  async function fetchRow(id: string): Promise<NotifRow | null> {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, total, paid_at, created_at, customer:customers(name, phone, email)")
      .eq("id", id)
      .maybeSingle();
    return (data as unknown as NotifRow | null) ?? null;
  }

  useEffect(() => {
    load();
    const channelName = `admin-orders-notif-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const r = payload.new as NotifRow;
          toast.success(`Novo pedido ${r.order_number}`, {
            description: `Total ${formatPrice(r.total, "BRL")}`,
          });
          load();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const r = payload.new as NotifRow;
          const prev = payload.old as { status?: string };
          if (prev?.status !== r.status) {
            const m = statusMeta(r.status);
            if (r.status === "pago") {
              // Toast persistente com ação de WhatsApp — o payload do postgres_changes
              // não traz o join com customer, então buscamos a linha completa.
              void fetchRow(r.id).then((full) => {
                toast.success(`Pedido ${r.order_number} pago!`, {
                  description: full?.customer?.name
                    ? `Cliente: ${full.customer.name} · ${formatPrice(r.total, "BRL")}`
                    : `Total ${formatPrice(r.total, "BRL")}`,
                  duration: 20000,
                  action: full?.customer?.phone
                    ? {
                        label: "Enviar WhatsApp",
                        onClick: () => openPaidWhatsApp(full),
                      }
                    : undefined,
                });
              });
            } else if (["cancelado", "estornado", "falhou"].includes(r.status)) {
              toast.error(`Pedido ${r.order_number}: ${m.label}`);
            }
          }
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-admin-notif]")) setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unreadCount = useMemo(() => {
    return rows.filter((r) => eventTime(r) > lastRead).length;
  }, [rows, lastRead]);

  function markAllRead() {
    const now = new Date().toISOString();
    setLastRead(now);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, now);
  }

  return (
    <div className="relative" data-admin-notif>
      <button
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) markAllRead();
            return next;
          });
        }}
        className="relative flex items-center justify-center h-8 w-8 rounded-md hover:bg-white/10 text-white/80 hover:text-white transition"
        aria-label={`Notificações${unreadCount ? ` (${unreadCount} não lidas)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-h-[70vh] overflow-hidden rounded-lg border border-border bg-background shadow-2xl z-50 flex flex-col text-foreground">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Notificações</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Atualizações de pedidos
              </p>
            </div>
            <Link
              to="/pedidos"
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="overflow-y-auto divide-y divide-border">
            {rows.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <ShoppingBag className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Nenhum pedido ainda.
              </div>
            )}
            {rows.map((r) => {
              const m = statusMeta(r.status);
              const isNew = eventTime(r) > lastRead;
              const when = new Date(eventTime(r));
              return (
                <div
                  key={r.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition ${isNew ? "bg-primary/5" : ""}`}
                >
                  <Link
                    to="/pedidos/rastreio/$id"
                    params={{ id: r.id }}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 flex-1 min-w-0"
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.bg}`}>
                      <m.Icon className={`h-4 w-4 ${m.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate">
                          Pedido {r.order_number}
                        </p>
                        {isNew && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.label}
                        {r.customer?.name ? ` · ${r.customer.name}` : ""}
                        {` · ${formatPrice(r.total, "BRL")}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {when.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </Link>
                  {r.status === "pago" && r.customer?.phone && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openPaidWhatsApp(r);
                      }}
                      title="Enviar confirmação por WhatsApp"
                      className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md bg-[#25D366] text-white hover:opacity-90 transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
