// Webhook de pagamento — Mercado Pago (Checkout Pro).
//
// URL: POST https://<seu-dominio>/api/public/payment-webhook
//
// MP envia notificações de "payment" com header `x-signature: ts=...,v1=...`
// e `x-request-id`. O manifest assinado é:
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// A assinatura é HMAC-SHA256(manifest, MP_WEBHOOK_SECRET), comparada com v1.
// Depois de validar, buscamos o pagamento em /v1/payments/{id} e atualizamos
// a ordem correspondente (external_reference == order_number).

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function parseSignatureHeader(header: string): { ts?: string; v1?: string } {
  const out: Record<string, string> = {};
  for (const part of header.split(",")) {
    const [k, v] = part.split("=").map((s) => s?.trim());
    if (k && v) out[k] = v;
  }
  return { ts: out.ts, v1: out.v1 };
}

// Mapeia status do MP para o nosso enum de orders.status
function mapMpStatus(status: string): "pago" | "cancelado" | "aguardando_pagamento" | null {
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

export const Route = createFileRoute("/api/public/payment-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MP_WEBHOOK_SECRET;
        const token = process.env.MP_ACCESS_TOKEN;
        if (!secret || !token) {
          return new Response(
            JSON.stringify({ error: "Webhook MP não configurado" }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }

        const url = new URL(request.url);
        const sigHeader = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";
        const bodyText = await request.text();

        // MP envia data.id via query (?data.id=...) e/ou no body.
        let dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";
        let type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
        if (!dataId && bodyText) {
          try {
            const parsed = JSON.parse(bodyText) as {
              data?: { id?: string | number };
              type?: string;
              action?: string;
            };
            if (parsed.data?.id != null) dataId = String(parsed.data.id);
            if (!type && parsed.type) type = parsed.type;
          } catch { /* ignore */ }
        }

        if (!dataId) {
          return new Response("Missing data.id", { status: 400 });
        }

        // Só processa notificações de pagamento
        if (type && !type.includes("payment")) {
          return Response.json({ ok: true, ignored: type });
        }

        // Valida assinatura HMAC
        const { ts, v1 } = parseSignatureHeader(sigHeader);
        if (!ts || !v1) return new Response("Missing signature", { status: 401 });
        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const expected = createHmac("sha256", secret).update(manifest).digest("hex");
        if (!safeEqualHex(v1, expected)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // Busca detalhes do pagamento
        const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!payRes.ok) {
          const t = await payRes.text();
          console.error("MP payment fetch failed:", payRes.status, t);
          return new Response("Payment fetch failed", { status: 502 });
        }
        const pay = (await payRes.json()) as {
          id: number | string;
          status: string;
          external_reference?: string;
          transaction_amount?: number;
          payment_method_id?: string;
        };

        const orderNumber = pay.external_reference;
        if (!orderNumber) {
          return new Response("Missing external_reference", { status: 400 });
        }
        const mapped = mapMpStatus(pay.status);
        if (!mapped) {
          return Response.json({ ok: true, ignored_status: pay.status });
        }

        const supaUrl = (process.env.EXTERNAL_SUPABASE_URL ?? process.env.SUPABASE_URL);
        const supaKey = (process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
        if (!supaUrl || !supaKey) {
          return new Response("Supabase service role not configured", { status: 503 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(supaUrl, supaKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Segurança: valida valor cobrado vs total do pedido antes de marcar "pago"
        if (mapped === "pago") {
          const { data: ord } = await admin
            .from("orders").select("total").eq("order_number", orderNumber).maybeSingle();
          const expected = Number(ord?.total ?? NaN);
          const paidAmt = Number(pay.transaction_amount ?? NaN);
          if (!ord || !Number.isFinite(expected) || !Number.isFinite(paidAmt) || Math.abs(paidAmt - expected) > 0.01) {
            console.error("MP amount mismatch:", { orderNumber, expected, paidAmt });
            return Response.json({ ok: true, ignored: "amount_mismatch", orderNumber });
          }
        }

        const update: Record<string, unknown> = {
          status: mapped,
          payment_provider: "mercadopago",
          payment_id: String(pay.id),
        };
        if (mapped === "pago") update.paid_at = new Date().toISOString();


        const { error } = await admin
          .from("orders")
          .update(update)
          .eq("order_number", orderNumber);
        if (error) {
          console.error("orders update failed:", error);
          return new Response(`DB error: ${error.message}`, { status: 500 });
        }

        return Response.json({ ok: true, orderNumber, status: mapped });
      },
    },
  },
});
