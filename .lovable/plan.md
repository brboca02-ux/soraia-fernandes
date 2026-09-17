# Corrigir erro ao finalizar pedido ("invalid input syntax for type uuid: mock:...")

## Causa confirmada

Os produtos da vitrine (vindos do catálogo da loja) recebem o ID no formato `mock:<uuid>` em `src/lib/mockProducts.ts` (função `productToShopify`). No checkout (`src/routes/checkout.tsx`, ~linha 270), a limpeza do ID só remove o que vem antes de `/`, então o valor `mock:25978831-...` chega intacto ao banco, que espera um UUID puro — daí o erro "Não foi possível finalizar o pedido".

## Correção

1. **`src/routes/checkout.tsx`** — na montagem dos itens do pedido, remover também o prefixo `mock:` além do trecho antes de `/`. O resultado será sempre o UUID real do produto (ex.: `25978831-3b73-4955-86c9-476da1819deb`).
2. Verificar se `src/stores/cartStore.ts` (ou outro ponto) grava `productId` com prefixo `mock:`; se gravar, normalizar lá também para o ID puro, evitando que o problema reapareça em outros fluxos (ex.: carrinho abandonado).
3. Validar com typecheck (`bunx tsgo --noEmit`) e confirmar `build OK` no log de build.

## Detalhes técnicos

- Regex simples na limpeza: `rawId.split("/").pop()` seguido de `.replace(/^mock:/, "")`.
- O UUID resultante corresponde ao `id` real do produto na tabela `products`, então a função `place_order` valida estoque e preço normalmente.
- Nenhuma mudança visual ou de layout; apenas correção do fluxo de finalização.
