export interface ViaCepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function lookupCep(cep: string): Promise<ViaCepResult | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!r.ok) return null;
    const data = (await r.json()) as ViaCepResult;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

export const formatCep = (s: string) => {
  const c = s.replace(/\D/g, "").slice(0, 8);
  return c.length > 5 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
};
