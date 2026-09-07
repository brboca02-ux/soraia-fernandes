// Reconciliação de pagamentos Mercado Pago.
//
// Objetivo: pegar todos os pedidos em `aguardando_pagamento` das últimas
// 24h, perguntar ao MP se já foram aprovados e atualizar no banco. Serve
// de rede de segurança quando o webhook do MP não estiver configurado
// (ou o secret estiver errado).
//
// Segurança: exige `Authorization: Bearer <CRON_SECRET>` (ou header
// `x-cron-secret`). Sem isso, retorna 401. Nunca retorna PII.
//
// Também aceita GET pra facilitar chamada por cron/uptime services.

import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function mapMpStatus(
  status: string,
): "pago" | "cancelado" | "aguardando_pagamento" | null {
  switch (status) {
    case "approved":
      return "pago";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelado";
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
      return "aguardando_pagamento";
    default:
      return null;
  }
}

interface MpSearchResult {
  results?: Array<{
    id: number | string;
    status: string;
    external_reference?: string;
    date_approved?: string | null;
    transaction_amount?: number;
  }>;
}


async function reconcile(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  const mpToken = process.env.MP_ACCESS_TOKEN;
  const supaUrl = (process.env.EXTERNAL_SUPABASE_URL ?? process.env.SUPABASE_URL);
  const supaKey = (process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!cronSecret || !mpToken || !supaUrl || !supaKey) {
    return new Response(
      JSON.stringify({ error: "Reconcile não configurado" }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";
  const provided = bearer || headerSecret;
  if (!provided || !safeEqual(provided, cronSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(supaUrl, supaKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Pedidos aguardando pagamento nas últimas 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pending, error: selErr } = await admin
    .from("orders")
    .select("id, order_number, total, created_at")
    .eq("status", "aguardando_pagamento")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  if (selErr) {
    console.error("reconcile select failed:", selErr);
    return new Response(`DB error: ${selErr.message}`, { status: 500 });
  }

  const checked: Array<{
    orderNumber: string;
    mpStatus?: string;
    mapped?: string;
    updated?: boolean;
    error?: string;
  }> = [];

  for (const order of pending ?? []) {
    try {
      const url = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(order.order_number)}&sort=date_created&criteria=desc&limit=5`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });
      if (!res.ok) {
        checked.push({ orderNumber: order.order_number, error: `MP ${res.status}` });
        continue;
      }
      const json = (await res.json()) as MpSearchResult;
      const results = json.results ?? [];
      // Prioriza approved; caso contrário pega o mais recente
      const approved = results.find((r) => r.status === "approved");
      const chosen = approved ?? results[0];
      if (!chosen) {
        checked.push({ orderNumber: order.order_number, mpStatus: "no_payment" });
        continue;
      }
      const mapped = mapMpStatus(chosen.status);
      if (!mapped || mapped === "aguardando_pagamento") {
        checked.push({
          orderNumber: order.order_number,
          mpStatus: chosen.status,
          mapped: mapped ?? undefined,
          updated: false,
        });
        continue;
      }

      // Segurança: se aprovado, valida amount cobrado vs total do pedido
      if (mapped === "pago") {
        const expected = Number(order.total);
        const paidAmt = Number(chosen.transaction_amount ?? NaN);
        if (!Number.isFinite(paidAmt) || Math.abs(paidAmt - expected) > 0.01) {
          console.error("reconcile amount mismatch:", { orderNumber: order.order_number, expected, paidAmt });
          checked.push({ orderNumber: order.order_number, mpStatus: chosen.status, mapped, error: "amount_mismatch" });
          continue;
        }
      }

      const update: Record<string, unknown> = {
        status: mapped,
        payment_provider: "mercadopago",
        payment_id: String(chosen.id),
      };
      if (mapped === "pago") {
        update.paid_at = chosen.date_approved ?? new Date().toISOString();
      }


      const { error: updErr } = await admin
        .from("orders")
        .update(update)
        .eq("order_number", order.order_number)
        .eq("status", "aguardando_pagamento");

      if (updErr) {
        checked.push({
          orderNumber: order.order_number,
          mpStatus: chosen.status,
          mapped,
          error: updErr.message,
        });
      } else {
        checked.push({
          orderNumber: order.order_number,
          mpStatus: chosen.status,
          mapped,
          updated: true,
        });
      }
    } catch (e) {
      checked.push({
        orderNumber: order.order_number,
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  const summary = {
    ok: true,
    scanned: pending?.length ?? 0,
    updated: checked.filter((c) => c.updated).length,
    paid: checked.filter((c) => c.mapped === "pago" && c.updated).length,
    cancelled: checked.filter((c) => c.mapped === "cancelado" && c.updated).length,
    errors: checked.filter((c) => c.error).length,
    checked,
  };
  return Response.json(summary);
}

export const Route = createFileRoute("/api/public/reconcile-payments")({
  server: {
    handlers: {
      GET: async ({ request }) => reconcile(request),
      POST: async ({ request }) => reconcile(request),
    },
  },
});
