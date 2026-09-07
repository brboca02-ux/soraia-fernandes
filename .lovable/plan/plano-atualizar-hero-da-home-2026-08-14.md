# Plano: Atualizar Hero da Home

## Objetivo
Trocar a imagem e o formato da seção hero selecionada, removendo todos os textos e deixando apenas os botões de navegação (Feminino/Masculino).

## Alterações propostas

### 1. Nova imagem do hero
- Publicar a imagem enviada (`Model_couple_posing_in_studio_202608132326.jpeg`) como asset Lovable.
- Criar o ponteiro em `src/assets/hero-couple.jpg.asset.json`.
- Substituir as imagens de fundo em `src/components/HomeSections.tsx` por uma única imagem responsiva, usando o novo asset.
- Atualizar os metadados `preload` em `src/routes/index.tsx` para apontar para o novo asset.

### 2. Novo formato/layout do hero
- A imagem enviada tem proporção landscape e o casal está à esquerda, com o logo à direita.
- Ajustar o `object-position` para manter os rostos visíveis em todos os viewports:
  - Mobile: foco central/top, mantendo os modelos visíveis.
  - Desktop: object-position ajustado para aproveitar o espaço negativo à direita se necessário, mas como o logo ocupa a direita, posicionar para não cortar os modelos.
- Ajustar altura da seção: reduzir `min-h` para evitar cortes em telas menores, mantendo impacto visual.

### 3. Remover textos, manter apenas botões
- Remover do componente `HomeHero` em `src/components/HomeSections.tsx`:
  - Label "Nova Coleção"
  - Título h1
  - Subtítulo e `cfg.heroSubtitle`
  - Link do Instagram
  - Link "Visite a loja no Aventureiro"
- Manter apenas:
  - Botão "Comprar Feminino"
  - Botão "Comprar Masculino"
- Reposicionar os botões para ficarem visíveis e acessíveis sobre a imagem. Opções de posicionamento:
  - Centro inferior, sobre overlay escuro, para garantir legibilidade dos botões.
  - Abaixo dos modelos na parte inferior da imagem.
- Ajustar o gradiente de overlay para garantir contraste dos botões (fundo escuro na área dos botões).
- Ajustar cores dos botões para manter acessibilidade: fundo preto/ônix com texto dourado/branco, ou botões outline branco sobre a imagem escura.

## Arquivos afetados
- `src/components/HomeSections.tsx`
- `src/routes/index.tsx`
- `src/assets/hero-couple.jpg.asset.json` (novo)

## Não incluso neste plano
- Não alterar outras seções da home, catálogo, carrinho ou checkout.
- Não alterar a tipografia ou paleta global (já estão definidas).
- Não re-seedar produtos ou modificar dados do banco.

## Validação
- Verificar build após as alterações.
- Verificar preview em mobile e desktop para garantir que a imagem não corta os modelos e os botões são legíveis.
