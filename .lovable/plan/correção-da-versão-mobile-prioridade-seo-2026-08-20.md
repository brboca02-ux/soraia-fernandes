# Correção da versão mobile (prioridade SEO)

Auditoria feita agora em `https://www.jesstorejoinville.com.br` num iPhone simulado (390x844) e comparada com o preview. O que foi confirmado:

## Problemas confirmados

1. **Hero da home quebrado no celular** — a moldura do banner usa proporção 3/4.5 + altura de 75% da tela, mas a foto é 16:9 e entra em modo "encaixar inteira". Resultado real medido: cerca de 200px de faixa preta vazia acima da imagem e mais de 300px vazios abaixo, com os botões "Comprar Feminino/Masculino" isolados no meio do nada. É o primeiro elemento visto no celular (e o LCP que o Google mede).
2. **Loja sem nenhum produto** — a consulta do catálogo retorna zero itens porque, no banco, todos os 75 produtos estão com status arquivado (27 femininos, 48 masculinos). Home e /colecao mostram "Coleção em preparação" tanto na produção quanto no preview. Sem produtos indexáveis, não há ranqueamento de loja.
3. **Endereço canônico apontando para o domínio errado** — 20 ocorrências de `www.jesstorejoinville.com.br` no código (canonical, og:url, breadcrumbs e sitemap). O site oficial é `www.jesstorejoinville.com.br`; isso faz o Google atribuir as páginas ao domínio antigo.
4. **Home sem título principal (H1)** — a página inicial não tem nenhum H1; o Google usa esse sinal para entender o tema da loja.
5. **Ajustes finos de mobile** — faixa rolante do topo com espaçamentos largos demais no celular, link "Início" da trilha de navegação com área de toque abaixo de 36px, e a foto do hero recortando as pessoas em telas estreitas.

Não foram encontrados erros de JavaScript nem rolagem horizontal indevida (a faixa rolante é intencional).

## O que será feito

### 1. Hero mobile (maior impacto visual)
- Trocar a moldura do banner no celular para uma proporção coerente com a imagem, eliminando as faixas preto vazias.
- Fazer a foto preencher a moldura com recorte centrado nas pessoas, sem distorção.
- Reposicionar o bloco de botões logo abaixo do conteúdo da imagem, com respiro consistente, e empilhar em largura total no celular com altura mínima de toque de 44px.
- Adicionar um H1 curto com a marca e o nicho ("Moda masculina e feminina em Joinville") sobre o hero, servindo tanto ao SEO quanto ao preenchimento visual.

### 2. Reativar o catálogo
- Reativar os produtos das categorias Masculino e Feminino no banco, de modo que voltem a aparecer na vitrine, na coleção e nas categorias. Produtos que você realmente quer fora do ar continuam podendo ser arquivados no painel, um a um.
- Conferir depois, no celular, que a grade aparece com 2 colunas e imagens carregando.

### 3. Domínio correto para o Google
- Substituir todas as URLs `www.jesstorejoinville.com.br` por `https://www.jesstorejoinville.com.br` em canonical, og:url, dados estruturados (breadcrumbs/produto) e no sitemap.

### 4. Acabamento mobile
- Reduzir espaçamentos e tamanho da faixa rolante no celular.
- Aumentar a área de toque dos links de trilha de navegação e dos filtros.
- Revisar espaçamentos verticais das seções da home no celular (vitrine, categorias, confiança, newsletter) para ritmo uniforme.
- Garantir que o botão flutuante do WhatsApp não cubra botões de ação (checkout e adicionar à sacola).

### 5. Verificação
- Nova passagem com navegador simulado em 390px e 360px nas páginas home, coleção, produto e checkout: capturas de tela, checagem de rolagem horizontal, alvos de toque e ausência de erros de console.

## Detalhes técnicos

- `src/components/HomeSections.tsx` → `HomeHero`: substituir `aspect-[3/4.5] h-[75vh] object-contain` por proporção mobile (~4/5) com `object-cover object-[center_25%]`; mover o container de botões de `absolute inset-x-0 bottom-0` para dentro do fluxo em telas pequenas, mantendo overlay em `sm+`; adicionar `<h1>` (visível, tipografia display, tamanho responsivo).
- Reativação do catálogo via migração: `update public.products set status = 'ativo' where category_id in ('masculino','feminino')`.
- URLs: atualizar `src/routes/index.tsx`, `colecao.tsx`, `produto.$handle.tsx`, `sobre.tsx`, `sitemap[.]xml.ts`, `__root.tsx`, `src/components/Breadcrumbs.tsx`, `src/lib/api/abandoned.ts`, `src/lib/integrations/payment.ts`.
- `src/components/Header.tsx`: faixa marquee com `gap-4 px-3` no mobile; `tap-target` aplicado aos links de breadcrumb em `src/routes/colecao.tsx`.
- Verificação com Playwright (`scripts/visual-regression.py` como base) em 390px e 360px.
