import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export const STORE_ID = "store_js_store";

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const onlyDigits = (s: string) => s.replace(/\D/g, "");
export const whatsAppHref = (phone: string, msg = "") =>
  `https://wa.me/${onlyDigits(phone)}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
