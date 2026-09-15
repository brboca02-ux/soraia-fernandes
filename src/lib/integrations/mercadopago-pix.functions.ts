// Cria pagamento PIX direto via API /v1/payments do Mercado Pago
// e permite consultar o status por polling. Diferente da preference
// (Checkout Pro), retorna o QR Code e o "copia e cola" pra exibir
// no próprio checkout, sem redirecionar.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "crypto";

const pixInput = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  amount: z.number().positive(),
  siteUrl: z.string().url(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    cpf: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export const createMpPixPayment = createServerFn({ method: "POST" })
  .inputValidator(pixInput)
  .handler(async ({ data }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");

    // Segurança: amount SEMPRE lido do banco pelo order_number.
    const supaUrl = (process.env.EXTERNAL_SUPABASE_URL ?? process.env.SUPABASE_URL);
    const supaKey = (process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!supaUrl || !supaKey) throw new Error("Supabase não configurado");
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(supaUrl, supaKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: ord, error: ordErr } = await admin
      .from("orders").select("total, status")
      .eq("order_number", data.orderNumber).maybeSingle();
    if (ordErr || !ord) throw new Error("Pedido não encontrado");
    if (ord.status !== "aguardando_pagamento") throw new Error("Pedido não está aguardando pagamento");
    const amountFromDb = Number(ord.total);

    const [firstName, ...rest] = data.customer.name.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;

    const body = {
      transaction_amount: Number(amountFromDb.toFixed(2)),

      description: `Pedido ${data.orderNumber} — Soraia Fernandes`,
      payment_method_id: "pix",
      external_reference: data.orderNumber,
      notification_url: `${data.siteUrl}/api/public/payment-webhook`,
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000)
        .toISOString()
        .replace("Z", "-03:00"),
      payer: {
        email: data.customer.email,
        first_name: firstName,
        last_name: lastName,
        ...(data.customer.cpf
          ? { identification: { type: "CPF", number: data.customer.cpf } }
          : {}),
      },
      metadata: { order_id: data.orderId, order_number: data.orderNumber },
    };

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("MP pix payment error:", res.status, text);
      throw new Error(`Mercado Pago recusou o PIX (${res.status})`);
    }

    const json = (await res.json()) as {
      id: number | string;
      status: string;
      point_of_interaction?: {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
          ticket_url?: string;
        };
      };
    };

    const td = json.point_of_interaction?.transaction_data ?? {};
    return {
      provider: "mercadopago",
      paymentId: String(json.id),
      status: json.status,
      qrCode: td.qr_code ?? null,
      qrCodeBase64: td.qr_code_base64 ?? null,
      ticketUrl: td.ticket_url ?? null,
    };
  });

export const getMpPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ paymentId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.paymentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`MP status ${res.status}`);
    const json = (await res.json()) as {
      id: number | string;
      status: string;
      external_reference?: string;
      transaction_amount?: number;
    };


    // Reconciliação: se aprovado, garante que o pedido seja marcado como "pago"
    // mesmo que o webhook do MP não tenha chegado (secret ausente, URL não
    // configurada no painel, etc.). Idempotente — só atualiza se ainda
    // estiver aguardando_pagamento.
    const orderNumber = json.external_reference;
    if (json.status === "approved" && orderNumber) {
      const supaUrl = (process.env.EXTERNAL_SUPABASE_URL ?? process.env.SUPABASE_URL);
      const supaKey = (process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
      if (supaUrl && supaKey) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const admin = createClient(supaUrl, supaKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          // Valida valor cobrado vs total do pedido
          const paidAmt = Number((json as { transaction_amount?: number }).transaction_amount ?? NaN);
          const { data: ord } = await admin
            .from("orders").select("total").eq("order_number", orderNumber).maybeSingle();
          const expected = Number(ord?.total ?? NaN);
          if (ord && Number.isFinite(paidAmt) && Number.isFinite(expected) && Math.abs(paidAmt - expected) <= 0.01) {
            await admin
              .from("orders")
              .update({
                status: "pago",
                payment_provider: "mercadopago",
                payment_id: String(json.id),
                paid_at: new Date().toISOString(),
              })
              .eq("order_number", orderNumber)
              .eq("status", "aguardando_pagamento");
          } else {
            console.error("pix reconcile amount mismatch:", { orderNumber, expected, paidAmt });
          }
        } catch (e) {
          console.warn("pix reconcile update failed:", e);
        }
      }
    }


    return { paymentId: String(json.id), status: json.status };
  });
