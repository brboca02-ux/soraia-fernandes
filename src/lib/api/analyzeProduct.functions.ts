import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeFallbackSizes } from "@/lib/products/variantSizes";


export type DetectedColor = { name: string; hex: string; image_index: number };

export type AnalyzedProduct = {
  name: string;
  description: string;
  category_id: "feminino" | "masculino";
  piece_type: string;
  color: string;
  colors: DetectedColor[];
  brand: string;
  brands: string[];
  sizes_suggested: string[];
  meta_title: string;
  meta_description: string;
};

const CATEGORIES = ["feminino", "masculino"];

export const analyzeProductImage = createServerFn({ method: "POST" })
  .inputValidator(
    z
      .object({
        imageDataUrl: z.string().min(20).optional(),
        imageDataUrls: z.array(z.string().min(20)).min(1).max(8).optional(),
      })
      .refine((v) => Boolean(v.imageDataUrl || v.imageDataUrls?.length), {
        message: "Envie ao menos uma imagem.",
      }),
  )
  .handler(async ({ data }): Promise<AnalyzedProduct> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente no servidor.");

    const images = (data.imageDataUrls?.length ? data.imageDataUrls : [data.imageDataUrl!]).slice(0, 8);

    const system = `Você é uma especialista em moda da loja Soraia Fernandes.
Analise as FOTOS do produto e responda APENAS com JSON puro (sem markdown, sem crase).

Você receberá ${images.length} foto(s), numeradas de 0 a ${images.length - 1} na ordem em que aparecem.
REGRA CRÍTICA: cada foto pode mostrar a MESMA peça em uma COR DIFERENTE. Você DEVE identificar a cor de CADA foto e listar TODAS elas no array "colors", informando em "image_index" o número da foto onde aquela cor aparece. Nunca devolva apenas a cor da primeira foto. Se uma única foto mostrar várias peças de cores diferentes (grade/conjunto), liste todas com o mesmo image_index.

Formato exato:
{
  "name": "Nome curto e comercial em português (máx 60 caracteres)",
  "description": "Descrição vendedora em português com tecido, caimento e ocasião de uso (2-3 frases)",
  "category_id": "uma de: ${CATEGORIES.join(", ")}",
  "piece_type": "tipo específico da peça em português (ex: Camiseta, Camisa polo, Calça jeans, Bermuda de sarja, Short de sarja)",
  "color": "cor principal ou predominante em português",
  "colors": [{"name": "nome da cor em português", "hex": "#rrggbb", "image_index": 0}],
  "brand": "marca visível em etiqueta, logo ou estampa; use "" se não houver nada legível",
  "brands": ["todas as marcas legíveis nas fotos"],
  "sizes_suggested": ["PP","P","M","G","GG"],
  "meta_title": "Título SEO em português (máx 60 caracteres)",
  "meta_description": "Descrição SEO em português (máx 155 caracteres)"
}
Regras:
- "colors": uma entrada por cor visível, com hex real aproximado e nome curto em português (ex: "Rosa Pink", "Azul Marinho", "Cinza Mescla", "Verde Esmeralda"). Não repita a mesma cor duas vezes.
- "brand"/"brands": NUNCA invente marca. Só informe se houver texto/logo realmente legível na peça ou etiqueta; caso contrário devolva "" e [].
- "sizes_suggested": tamanhos típicos para essa peça. Calças, shorts e bermudas femininas (numeração): ["36","38","40","42","44"]. Calças, shorts e bermudas masculinas: ["38","40","42","44","46","48"]. Numeração ampliada (peças 50+): ["50","52","54","56"]. Demais roupas (camisetas, polos, camisas, t-shirts, tricot): ["P","M","G","GG"]. Se a peça for claramente tamanho único (ex: echarpe, cinto, poncho, ou etiqueta dizendo U), inclua apenas ["Único"].
- "piece_type": nome específico da peça (2-4 palavras), sem cor nem marca.
- Categoria: peças femininas → "feminino"; peças masculinas → "masculino". A loja vende somente moda masculina e feminina adulta.`;

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Analise as ${images.length} foto(s) desta peça e devolva o JSON. Liste a cor de cada foto com seu image_index.`,
      },
    ];
    images.forEach((url, i) => {
      userContent.push({ type: "text", text: `Foto ${i}:` });
      userContent.push({ type: "image_url", image_url: { url } });
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha ao analisar imagem (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed: Partial<AnalyzedProduct> & { colors?: unknown; sizes_suggested?: unknown; brands?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }

    const category = (CATEGORIES.includes(parsed.category_id ?? "") ? parsed.category_id : "feminino") as AnalyzedProduct["category_id"];

    const hexRe = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
    const rawColors = Array.isArray(parsed.colors) ? parsed.colors : [];
    const seen = new Set<string>();
    const colors: DetectedColor[] = rawColors
      .map((c) => {
        const obj = c as { name?: unknown; hex?: unknown; image_index?: unknown };
        const name = (obj?.name ?? "").toString().trim().slice(0, 30);
        const hex = (obj?.hex ?? "").toString().trim();
        const idxNum = Number(obj?.image_index);
        const image_index = Number.isFinite(idxNum) && idxNum >= 0 && idxNum < images.length ? Math.floor(idxNum) : 0;
        return { name, hex: hexRe.test(hex) ? hex : "", image_index };
      })
      .filter((c) => {
        const k = c.name.toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 12);
    if (colors.length === 0 && parsed.color) {
      colors.push({ name: parsed.color.toString().slice(0, 30), hex: "", image_index: 0 });
    }

    const rawBrands = Array.isArray(parsed.brands) ? parsed.brands : [];
    const seenB = new Set<string>();
    const brands = rawBrands
      .map((b) => String(b).trim().slice(0, 40))
      .filter((b) => {
        const k = b.toLowerCase();
        if (!b || k === "soraia fernandes" || seenB.has(k)) return false;
        seenB.add(k);
        return true;
      })
      .slice(0, 5);
    const brandRaw = (parsed.brand ?? "").toString().trim().slice(0, 40);
    const brand = brandRaw || brands[0] || "";

    const rawSizes = Array.isArray(parsed.sizes_suggested) ? parsed.sizes_suggested : [];
    const sizes_suggested = rawSizes
      .map((s) => String(s).trim().slice(0, 6))
      .filter(Boolean)
      .slice(0, 10);

    const pieceType = ((parsed as { piece_type?: unknown }).piece_type ?? "").toString().slice(0, 40);
    const fallbackSizes = computeFallbackSizes({ category, pieceType });


    return {
      name: (parsed.name ?? "").toString().slice(0, 80) || "Produto Soraia Fernandes",
      description: (parsed.description ?? "").toString(),
      category_id: category,
      piece_type: pieceType,
      color: (parsed.color ?? colors[0]?.name ?? "Único").toString().slice(0, 40) || "Único",
      colors,
      brand,
      brands: brand && !brands.some((b) => b.toLowerCase() === brand.toLowerCase()) ? [brand, ...brands] : brands,
      sizes_suggested: sizes_suggested.length ? sizes_suggested : fallbackSizes,
      meta_title: (parsed.meta_title ?? parsed.name ?? "").toString().slice(0, 70),
      meta_description: (parsed.meta_description ?? parsed.description ?? "").toString().slice(0, 170),
    };
  });
