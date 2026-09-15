# Auditoria do painel admin — o que foi feito e o que ficou pendente

Verificado lendo as telas/bibliotecas do painel e consultando o banco (leads 0, cupons 2, clientes 0, mídia 0, movimentações 0, pedidos 0, produtos ativos 24, arquivados 0, admins 1).

## Confirmado como executado
- **Acesso restrito a admin**: `AdminShell` checa a sessão e o papel em `user_roles`, mostra "Verificando permissões", avisa e redireciona quem não é admin. Todas as telas do painel usam esse shell.
- **Clientes com dados reais**: `customersStore` lê `customers`/pedidos do banco (não mais do navegador). Está vazio porque ainda não há pedidos no banco.
- **Cupons no banco + checkout**: tabela `coupons` criada com 2 registros; painel cria/lista/apaga e o checkout valida e aplica desconto.
- **Leads no banco**: tabela `leads` criada com captura pública; painel e dashboard leem do servidor.
- **Produtos/Arquivar**: arquivar apenas muda status, com botão "Reativar"; apagar só na lixeira. Produtos arquivados continuam visíveis no painel.

## Pendências reais encontradas
1. **Configurações da home ainda presas ao navegador** — `siteConfig.ts` grava só em `localStorage` (comentário explícito no arquivo). Outro dispositivo/visitante vê os textos padrão. Tabela de configuração nunca foi criada.
2. **Imagens da home não persistidas** — `site_media` está com 0 registros, apesar de `siteMedia.ts` estar pronto; o painel de mídia provavelmente falha ao salvar (verificar upload/gravação).
3. **Leads com gravação duplicada** — `saveLead` grava no navegador e no banco, e a leitura cai para o navegador em caso de erro: gera lead duplicado/fantasma e esconde falhas.
4. **Cupons com fallback silencioso no navegador** — se o banco recusar (ex.: não-admin), o cupom é salvo local e parece ter funcionado. Além disso, `usage_count` nunca é incrementado ao usar o cupom no checkout, então limite de uso não vale de fato.
5. **Movimentações de estoque vazias** — `stock_movements` sem registros; conferir se ajustes manuais e baixas de venda estão sendo registrados.
6. **Server function de admin quebrada/sem uso** — `src/lib/auth.functions.ts` usa o cliente do navegador dentro de função de servidor; nunca é chamada. Deve ser removida ou reescrita com o middleware autenticado.

## Correções propostas
- Criar tabela de configuração do site (leitura pública, escrita só admin) e migrar `siteConfig` para ela, mantendo o cache local só como aceleração.
- Corrigir a gravação de mídia da home e salvar as imagens atuais em `site_media`.
- Tirar os fallbacks de navegador de leads e cupons: erro passa a aparecer como aviso claro no painel.
- Incrementar o uso do cupom quando o pedido é criado, para o limite de uso funcionar.
- Registrar movimentação de estoque em ajuste manual e em venda.
- Remover/reescrever `auth.functions.ts` e manter a checagem de admin também no banco (políticas já exigem admin).
- Reteste ponta a ponta das seis telas em desktop e mobile após as correções.

## Notas técnicas
- Nova tabela `site_config` (chave/valor JSON) com `GRANT` para anon (leitura) e authenticated/service_role, RLS: select público, write via `has_role(auth.uid(),'admin')`.
- Incremento de uso do cupom dentro de `place_order` (recebendo o código no payload), evitando corrida no cliente.
- Movimentações via `logStockMovement` já existente em `supaProducts.ts`, chamado nos fluxos de ajuste e de baixa por venda.
