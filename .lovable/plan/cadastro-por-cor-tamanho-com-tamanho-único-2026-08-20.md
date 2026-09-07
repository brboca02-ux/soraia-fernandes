# Cadastro por cor + tamanho (com "Tamanho Único")

## Objetivo
Hoje, no painel, cada variação é uma linha solta (tamanho, cor, estoque digitados um por um). Para peças de tamanho único isso é trabalhoso e confuso; e quando a mesma peça tem vários tamanhos por cor, fica difícil ver o que existe.

A ideia é organizar o cadastro **por cor**: escolhe a peça, informa a cor e, dentro dela, os tamanhos com estoque. Se for tamanho único, um clique resolve.

## Como vai funcionar no painel

1. **Modo de tamanhos** (escolha no topo do bloco Variações):
   - "Tamanho único" — cada cor gera uma única variação (tamanho `Único`) com um campo de estoque.
   - "Vários tamanhos" — cada cor abre uma linha de tamanhos com estoque individual.
2. **Blocos por cor**: cada cor aparece como um cartão com nome da cor, bolinha de cor (hex editável), miniatura da imagem vinculada e o estoque (único ou por tamanho).
3. **Vincular imagem à cor**: em vez de depender do nome do arquivo, o admin escolhe a imagem da galeria que representa aquela cor (clique na miniatura). O vínculo continua salvo pelo nome da cor, então a loja segue filtrando as fotos ao trocar de cor.
4. **Tamanhos rápidos**: chips de tamanhos sugeridos (PP–XG, ou numeração 36–46 quando a peça for calça/short/saia) para marcar/desmarcar em massa dentro da cor.
5. **Resumo**: total de variações e estoque somado, para conferência antes de salvar.
6. A detecção com IA (cores + tamanhos) continua igual, só passa a preencher esses blocos por cor.

## Loja (sem mudança de comportamento)
A página do produto já seleciona Cor e Tamanho e desabilita combinações sem estoque. Com tamanho único, o seletor de tamanho some e o cliente só escolhe a cor.

## Detalhes técnicos
- Alterações concentradas em `src/components/ProductForm.tsx`: novo editor agrupado por cor derivado de `data.variants` (agrupar por `color`, expandir de volta para linhas `{size, color, color_hex, stock}` ao salvar). Sem mudança de schema — `product_variants` já tem `size`, `color`, `color_hex`, `stock`.
- Tamanho único grava `size = "Único"`, padrão já usado no seed de teste.
- Reutilizar `computeFallbackSizes` / `buildSizeVariants` de `src/lib/products/variantSizes.ts` para os chips de tamanho e distribuição de estoque.
- `src/routes/produto.$handle.tsx` esconde o seletor quando só existe o tamanho `Único` (ajuste pequeno na lista de tamanhos).
- Vínculo imagem↔cor: manter compatível com o filtro atual por nome (`url.includes(slug da cor)`) e, quando o admin escolher manualmente, renomear/ordenar a imagem daquela cor como primária do grupo.
