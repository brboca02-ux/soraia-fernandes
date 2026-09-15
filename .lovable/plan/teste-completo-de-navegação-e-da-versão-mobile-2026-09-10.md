# Teste completo de navegação e da versão mobile

Objetivo: percorrer o site inteiro como um visitante real, no computador e no celular, e listar tudo que estiver quebrado, com correção dos problemas encontrados.

## Como o teste será feito

Navegação automatizada em três larguras de tela:
- Celular pequeno (360 px) e celular padrão (390 px)
- Tablet (768 px)
- Computador (1280 px)

Em cada página serão verificados:
- A página abre sem tela branca e sem erro
- Nenhum texto ou imagem cortado, sobreposto ou saindo da tela (rolagem lateral indevida)
- Todos os links e botões levam ao destino certo (nenhum link morto)
- Botões e menus com tamanho de toque adequado no celular
- Imagens carregando (sem espaço vazio nem foto quebrada)
- Menu, busca, sacola e botão do WhatsApp funcionando

## Páginas e fluxos cobertos

Loja:
- Início
- Coleção (com filtros e ordenação)
- Página de produto (escolha de cor/tamanho, adicionar à sacola)
- Sacola e Checkout (até a etapa de pagamento, sem finalizar compra)
- Alugar, Sobre, Trocas e devoluções, Privacidade, Termos
- Acompanhar pedido
- Página inexistente (404) e volta para a loja

Área da cliente e painel:
- Login
- Meus pedidos
- Painel: produtos, pedidos, categorias, marketing, estoque

## Entrega

- Relatório em linguagem simples com a lista de problemas encontrados, separados por página e por tamanho de tela, com capturas de tela dos casos visuais.
- Correção dos problemas de navegação e de layout no celular encontrados durante o teste (links errados, quebras de layout, botões pequenos demais, imagens com espaço vazio).
- Nova passagem de verificação depois das correções para confirmar que tudo ficou certo.

Observação: problemas que dependam de conteúdo cadastrado (produtos sem foto, textos faltando) serão apenas relatados, não inventados.

## Detalhes técnicos

- Playwright headless (base em `scripts/visual-regression.py`) contra `http://localhost:8080`, viewports 360/390/768/1280.
- Coleta por página: erros de console, requisições com falha (rede), `document.scrollingElement.scrollWidth > innerWidth`, varredura de elementos com `getBoundingClientRect().width < 44` em links/botões, e `naturalWidth === 0` em imagens.
- Rotas conferidas contra `src/routeTree.gen.ts`; links internos extraídos do DOM e validados contra a lista de rotas para detectar destinos inexistentes.
- Sessão autenticada para as rotas do painel via sessão Supabase injetada/mintada, sem expor credenciais.
- Correções restritas a componentes de apresentação (`src/components/*`, rotas em `src/routes/*`) salvo se um bug de dados for a causa raiz — nesse caso será relatado antes de qualquer mudança de lógica.
