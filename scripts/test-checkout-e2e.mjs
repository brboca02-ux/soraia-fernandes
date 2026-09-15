#!/usr/bin/env node
/**
 * Teste E2E de integração do checkout.
 * Verifica que customers, addresses, orders e order_items gravam no Supabase
 * sob o role `anon` (visitante), replicando o fluxo de src/lib/api/supaOrders.ts.
 *
 * Uso:
 *   node scripts/test-checkout-e2e.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = "https://snqvhexeruvlyrtzsdnm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucXZoZXhlcnV2bHlydHpzZG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzE0NjUsImV4cCI6MjA5NzcwNzQ2NX0.VmGWqBvCCUIc19kQaJKnYht2d-J4FuonzT-deHRmWcw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

let passed = 0;
let failed = 0;
const failures = [];

async function step(name, fn) {
  process.stdout.write(`${CYAN}▶${RESET} ${name} ... `);
  try {
    const result = await fn();
    console.log(`${GREEN}OK${RESET}`);
    passed++;
    return result;
  } catch (err) {
    console.log(`${RED}FAIL${RESET}`);
    console.log(`  ${RED}${err?.message ?? err}${RESET}`);
    if (err?.code) console.log(`  code=${err.code} details=${err.details ?? ""} hint=${err.hint ?? ""}`);
    failed++;
    failures.push({ name, err });
    throw err;
  }
}

function orderNumber() {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).toUpperCase();
  const suf = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MD-${year}-${ts}${suf}`;
}

async function main() {
  console.log(`${YELLOW}== Checkout E2E (role: anon) ==${RESET}\n`);

  const customerId = randomUUID();
  const addressId = randomUUID();
  const orderId = randomUUID();
  const ordNum = orderNumber();
  const email = `e2e_${Date.now()}@teste.mdmodas.local`;

  try {
    await step("INSERT customers", async () => {
      const { error } = await supabase.from("customers").insert({
        id: customerId,
        name: "Cliente E2E",
        email,
        phone: "11999999999",
        cpf: "00000000000",
        user_id: null,
      });
      if (error) throw error;
    });

    await step("INSERT addresses", async () => {
      const { error } = await supabase.from("addresses").insert({
        id: addressId,
        customer_id: customerId,
        cep: "01310100",
        street: "Av. Paulista",
        number: "1000",
        complement: null,
        district: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      });
      if (error) throw error;
    });

    await step("INSERT orders", async () => {
      const { error } = await supabase.from("orders").insert({
        id: orderId,
        order_number: ordNum,
        customer_id: customerId,
        address_id: addressId,
        subtotal: 100,
        shipping_cost: 15,
        shipping_method: "PAC",
        discount: 0,
        total: 115,
        payment_method: "pix",
        notes: "pedido de teste E2E",
        status: "aguardando_pagamento",
      });
      if (error) throw error;
    });

    await step("INSERT order_items", async () => {
      const { error } = await supabase.from("order_items").insert([
        {
          order_id: orderId,
          product_id: null,
          product_name: "Produto Teste A",
          variant_size: "M",
          variant_color: "Preto",
          unit_price: 50,
          quantity: 1,
          subtotal: 50,
        },
        {
          order_id: orderId,
          product_id: null,
          product_name: "Produto Teste B",
          variant_size: null,
          variant_color: null,
          unit_price: 25,
          quantity: 2,
          subtotal: 50,
        },
      ]);
      if (error) throw error;
    });

    await step("SELECT order via order_number (público)", async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total")
        .eq("order_number", ordNum)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("pedido não encontrado via anon SELECT");
      if (data.id !== orderId) throw new Error("id do pedido não confere");
      if (Number(data.total) !== 115) throw new Error(`total esperado 115, veio ${data.total}`);
    });
  } catch {
    /* falhas já registradas */
  }

  console.log(
    `\n${YELLOW}Resumo:${RESET} ${GREEN}${passed} passou${RESET} · ${RED}${failed} falhou${RESET}`,
  );
  console.log(`  customerId=${customerId}`);
  console.log(`  orderId=${orderId} order_number=${ordNum}`);

  if (failed > 0) {
    console.log(`\n${RED}Teste E2E falhou.${RESET}`);
    process.exit(1);
  }
  console.log(`\n${GREEN}✓ Checkout grava customers/addresses/orders/order_items sob anon.${RESET}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
