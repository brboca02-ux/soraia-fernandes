import { createFileRoute } from "@tanstack/react-router";

/**
 * Serve imagens de produto do bucket privado `product-images` do Lovable Cloud.
 * O bucket não pode ser público neste workspace, então esta rota faz o proxy
 * somente-leitura com cache longo (as imagens têm nome imutável).
 */
export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = (params as { _splat?: string })._splat ?? "";
        // Bloqueia travessia de diretório e query strings.
        const path = raw.split("?")[0]!.replace(/\.\./g, "").replace(/^\/+/, "");
        if (!path || !/^[A-Za-z0-9._\-/]+$/.test(path)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("product-images")
          .download(path);

        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": data.type || "image/webp",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});