import { supabase } from "@/integrations/supabase/client";

export type LeadSource = "newsletter" | "footer" | "welcome_popup" | "exit_intent";

export interface Lead {
  id?: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  /** Legacy fields kept for back-compat */
  type?: "email" | "whatsapp";
  value?: string;
  source?: LeadSource | string;
  created_at?: string;
  at?: string; // for compatibility with existing code
}

export async function loadLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name ?? undefined,
    email: l.email ?? undefined,
    whatsapp: l.phone ?? undefined,
    source: l.source ?? undefined,
    created_at: l.created_at,
    at: l.created_at,
  }));
}

export async function saveLead(lead: Lead) {
  const { error } = await supabase.from("leads").insert({
    name: lead.name ?? null,
    email: lead.email ?? null,
    phone: lead.whatsapp ?? null,
    source: lead.source ?? null,
  });
  if (error) throw new Error(error.message);
  if (typeof window !== "undefined") {
    try { localStorage.setItem(CAPTURED_KEY, "1"); } catch { /* marcador opcional */ }
  }
}

/** Marcador local: este navegador já deixou um contato (evita repetir o pop-up). */
const CAPTURED_KEY = "js_lead_captured_v1";

export function hasAnyLead(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CAPTURED_KEY) === "1" || localStorage.getItem("md_leads_v1") !== null;
}

export function cleanEmail(v: string) {
  return v.trim().slice(0, 254);
}

export function cleanPhone(v: string) {
  return v.replace(/[^\d+]/g, "").slice(0, 16);
}

export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function isValidPhone(v: string) {
  return v.replace(/\D/g, "").length >= 10;
}
