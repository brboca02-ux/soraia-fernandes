// InfinitePay — checkout por link público (handle da loja).
// O valor é SEMPRE lido do banco pelo order_number; o client nunca define preço.
// A confirmação usa o endpoint público de verificação de transação da InfinitePay.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const INFINITEPAY_HANDLE = "soraia-cristina-4n6";

const CHECKOUT_BASE = "https://checkout.infinitepay.io";
const PAYMENT_CHECK_URL =
  "https://api.infinitepay.io/invoices/public/checkout/payment_check";

async function getAdmin() {
  const supaUrl = process.env.EXTERNAL_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supaKey =
    process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) throw new Error("Banco não configurado");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(supaUrl, supaKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const createSchema = z.object({
  orderNumber: z.string().min(1),
  siteUrl: z.string().url(),
  customer: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

export const createInfinitePayCheckout = createServerFn({ method: "POST" })
  .inputValidator(createSchema)
  .handler(async ({ data }) => {
    const admin = await getAdmin();

    const { data: ord, error: ordErr } = await admin
      .from("orders")
      .select("id, total, shipping_cost, discount, status")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (ordErr || !ord) throw new Error("Pedido não encontrado");
    if (ord.status !== "aguardando_pagamento") {
      throw new Error("Pedido não está aguardando pagamento");
    }

    const { data: rows } = await admin
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", ord.id);

    const total = Number(ord.total);
    if (!Number.isFinite(total) || total <= 0) throw new Error("Valor do pedido inválido");
    const totalCents = Math.round(total * 100);

    // Itens detalhados + linha de ajuste (frete/desconto) para bater o total exato.
    const items = (rows ?? []).map((r) => ({
      name: String(r.product_name).slice(0, 60),
      price: Math.round(Number(r.unit_price) * 100),
      quantity: Number(r.quantity),
    }));
    const itemsCents = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const diff = totalCents - itemsCents;
    if (items.length === 0) {
      items.push({ name: `Pedido ${data.orderNumber}`, price: totalCents, quantity: 1 });
    } else if (diff > 0) {
      items.push({ name: "Frete", price: diff, quantity: 1 });
    } else if (diff < 0) {
      // Desconto: InfinitePay não aceita valor negativo — colapsa em um item único.
      items.length = 0;
      items.push({ name: `Pedido ${data.orderNumber}`, price: totalCents, quantity: 1 });
    }

    const redirectUrl = new URL(
      `/pedido/sucesso/${encodeURIComponent(data.orderNumber)}`,
      data.siteUrl,
    );
    if (data.customer?.email) redirectUrl.searchParams.set("email", data.customer.email);

    const url = new URL(`${CHECKOUT_BASE}/${INFINITEPAY_HANDLE}`);
    url.searchParams.set("items", JSON.stringify(items));
    url.searchParams.set("order_nsu", data.orderNumber);
    url.searchParams.set("redirect_url", redirectUrl.toString());
    if (data.customer?.name) url.searchParams.set("customer_name", data.customer.name);
    if (data.customer?.email) url.searchParams.set("customer_email", data.customer.email);
    if (data.customer?.phone) url.searchParams.set("customer_cellphone", data.customer.phone);

    return {
      provider: "infinitepay",
      paymentId: data.orderNumber,
      paymentUrl: url.toString(),
    };
  });

const checkSchema = z.object({
  orderNumber: z.string().min(1),
  transactionNsu: z.string().min(1),
  slug: z.string().optional(),
});

export const checkInfinitePayPayment = createServerFn({ method: "POST" })
  .inputValidator(checkSchema)
  .handler(async ({ data }) => {
    const admin = await getAdmin();

    const { data: ord } = await admin
      .from("orders")
      .select("id, total, status")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (!ord) throw new Error("Pedido não encontrado");
    if (ord.status === "pago") return { paid: true, alreadyPaid: true };

    const res = await fetch(PAYMENT_CHECK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle: INFINITEPAY_HANDLE,
        transaction_nsu: data.transactionNsu,
        external_order_nsu: data.orderNumber,
        ...(data.slug ? { slug: data.slug } : {}),
      }),
    });
    if (!res.ok) {
      console.error("InfinitePay payment_check falhou:", res.status, await res.text());
      return { paid: false, error: "check_failed" as const };
    }
    const json = (await res.json()) as {
      success?: boolean;
      paid?: boolean;
      amount?: number;
availability?: unknown;
    };
    const paid = Boolean(json.success ?? json.paid);
    if (!paid) return { paid: false };

    // Valida o valor quando a InfinitePay o devolve (em centavos).
    if (typeof json.amount === "number") {
      const expected = Math.round(Number(ord.total) * 100);
      if (Math.abs(json.amount - expected) > 1) {
        console.error("InfinitePay amount mismatch", { expected, got: json.amount });
        return { paid: false, error: "amount_mismatch" as const };
      }
    }

    const { error } = await admin
      .from("orders")
      .update({
        status: "pago",
        paid_at: new Date().toISOString(),
        payment_provider: "infinitepay",
        payment_id: data.transactionNsu,
      })
      .eq("id", ord.id);
    if (error) throw new Error(error.message);

    return { paid: true };
  });
