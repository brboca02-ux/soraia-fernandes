# Detecção de todas as cores (multi-imagem) + marca

## Problema confirmado

Na análise por IA do cadastro de produto, apenas **uma** imagem é enviada ao modelo (a imagem marcada como "Principal"). Quando cada foto mostra a peça em uma cor diferente (rosa, azul marinho, cinza, verde), a IA só consegue ver a cor da primeira foto — por isso "só detectou a rose".

Além disso, a marca (brand) não é detectada pela IA: hoje o campo "Marca" fica sempre com o valor padrão "J&S Store".

## O que vai mudar

1. **Analisar todas as imagens do produto**, não só a principal
   - Todas as fotos enviadas (limite de segurança: até 8) vão juntas na mesma análise.
   - A IA passa a listar a cor de **cada** foto, na mesma ordem em que aparecem.

2. **Vincular cor ↔ foto**
   - Cada cor detectada guarda o índice da foto correspondente, para o painel mostrar a miniatura certa em cada bloco de cor (aproveitando os blocos por cor já existentes).
   - Cores repetidas entre fotos são agrupadas (sem duplicar).

3. **Detecção de marca**
   - A IA passa a ler etiquetas, estampas e logos visíveis e sugerir a marca.
   - Se nada legível for encontrado, mantém "J&S Store" (sem inventar marca).
   - Se fotos diferentes indicarem marcas diferentes, a sugestão vem como lista e a marca principal é aplicada ao campo "Marca"; as demais aparecem como sugestão no painel de IA.

4. **Painel de sugestão da IA**
   - Nova linha "Marca detectada" com opção de aplicar ou ignorar.
   - Lista de cores mostra a miniatura da foto de origem ao lado de cada cor, deixando claro qual foto é qual cor.

## Detalhes técnicos

- `src/lib/api/analyzeProduct.functions.ts`: input passa de `imageDataUrl: string` para `imageDataUrls: string[]` (mantendo compatibilidade com o campo antigo). O prompt envia um bloco `image_url` por foto, numerado, e pede JSON com `colors: [{name, hex, image_index}]` e `brand` / `brands`. Modelo: `google/gemini-3.7-flash` (padrão atual permitido pelo gateway).
- `src/components/ProductForm.tsx`: `runAnalysis` converte todas as imagens em data URLs (em paralelo), envia numa única chamada, faz o merge de cores por nome normalizado preservando `image_index`, e preenche o campo Marca a partir da sugestão.
- `src/routes/produtos.rapido.tsx`: ajustado para o novo formato de entrada (envia a única imagem como array) e passa a aproveitar a marca detectada.
- Tipos exportados (`DetectedColor`, `AnalyzedProduct`) ganham `image_index` e `brand`/`brands`; nenhuma mudança de banco é necessária — cores continuam gravadas em `product_variants`.
- Validação real: após a alteração, uma chamada de teste ao gateway confirma o retorno com as 4 cores do exemplo antes de considerar concluído.
