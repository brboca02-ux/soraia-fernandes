// Checkout Transparente — Card Payment Brick.
// Recebe o token gerado pelo brick no client e cria o pagamento
// via API /v1/payments do Mercado Pago, mantendo o MP_ACCESS_TOKEN server-only.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "crypto";

const publicKeyOutput = z.object({ publicKey: z.string() });

export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const publicKey = process.env.MP_PUBLIC_KEY;
  if (!publicKey) throw new Error("MP_PUBLIC_KEY não configurado");
  return publicKeyOutput.parse({ publicKey });
});

const cardInput = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  amount: z.number().positive(),
  siteUrl: z.string().url(),
  token: z.string().min(1),
  installments: z.number().int().positive(),
  paymentMethodId: z.string().min(1),
  issuerId: z.string().optional(),
  payer: z.object({
    email: z.string().email(),
    identification: z
      .object({
        type: z.string().min(1),
        number: z.string().min(1),
      })
      .optional(),
  }),
});

export const createMpCardPayment = createServerFn({ method: "POST" })
  .inputValidator(cardInput)
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

    const body = {
      transaction_amount: Number(amountFromDb.toFixed(2)),

      token: data.token,
      description: `Pedido ${data.orderNumber} — Soraia Fernandes`,
      installments: data.installments,
      payment_method_id: data.paymentMethodId,
      ...(data.issuerId ? { issuer_id: data.issuerId } : {}),
      external_reference: data.orderNumber,
      notification_url: `${data.siteUrl}/api/public/payment-webhook`,
      statement_descriptor: "SORAIA FERNANDES",
      payer: {
        email: data.payer.email,
        ...(data.payer.identification
          ? { identification: data.payer.identification }
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

    const json = (await res.json().catch(() => ({}))) as {
      id?: number | string;
      status?: string;
      status_detail?: string;
      message?: string;
    };

    if (!res.ok || !json.id) {
      console.error("MP card payment error:", res.status, json);
      throw new Error(
        json.message ?? json.status_detail ?? `Mercado Pago recusou o cartão (${res.status})`,
      );
    }

    return {
      provider: "mercadopago",
      paymentId: String(json.id),
      status: json.status ?? "unknown",
      statusDetail: json.status_detail ?? null,
    };
  });
