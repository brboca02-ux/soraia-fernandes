# Plano de Auditoria e Correção: Imagens das Categorias no Painel Adm

Este plano visa corrigir o problema relatado onde as imagens das categorias não aparecem no painel administrativo, além de realizar uma auditoria geral de funcionalidade.

## Problema Identificado
A auditoria detectou que:
1. **Painel Adm (Categorias):** A lista de categorias (`/categorias`) não renderiza as imagens porque os dados carregados do banco (`site_media` via `useSiteMedia`) não estão sendo sincronizados com a `CategoriesStore`.
2. **Configurações:** O componente `HomeMediaSettings` renderiza banners fixos ("cat_feminino", "cat_masculino"), mas a lista principal de categorias no painel administrativo usa dados da tabela `categories`.
3. **Vitrine:** As imagens da vitrine na home e no painel estão funcionais, mas o layout do painel administrativo precisa de ajustes de visibilidade para os botões de ação em telas menores.

## Ações Propostas

### 1. Sincronização de Imagens (Catálogo/Categorias)
- Modificar o componente `CategoriesListPage` em `src/routes/categorias.index.tsx` para garantir que ele exiba a imagem correta da categoria.
- Se a categoria for "Masculino" ou "Feminino", tentaremos usar primeiro a imagem definida em `site_media` (banners da home) antes de cair para a imagem individual da categoria.

### 2. Correção Visual no Painel Adm
- Ajustar `src/routes/categorias.index.tsx` para que as imagens nas tabelas e cards mobile usem um fallback visual melhor quando não houver imagem.
- Verificar o componente `AdminShell` para garantir que o menu lateral não oculte elementos essenciais.

### 3. Melhoria na Gestão de Mídia
- Atualizar `src/components/admin/HomeMediaSettings.tsx` para que, ao trocar a imagem de um banner de categoria (Feminino/Masculino), ele também ofereça a opção de atualizar a imagem da categoria correspondente no catálogo global.

## Detalhes Técnicos
- **Localização:** `src/routes/categorias.index.tsx`, `src/components/admin/HomeMediaSettings.tsx`, `src/lib/api/siteMedia.ts`.
- **Lógica:** Implementar um hook de fallback para imagens de categoria que priorize `site_media` para as categorias principais.
- **Validação:** Nova auditoria visual via Playwright após as alterações.
