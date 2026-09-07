# Auditoria de funcionalidade do Painel da Loja

Levantamento feito lendo as telas do painel e consultando o banco. Abaixo o estado real de cada área e o que será corrigido.

## O que já funciona
- **Produtos**: lista, filtros (nome/categoria/status), editar, duplicar, arquivar, apagar, marcar vitrine — tudo ligado ao banco (24 produtos cadastrados).
- **Pedidos**: carrega do banco, atualiza em tempo real, botão de recarregar.
- **Dashboard**: KPIs de vendas, pedidos, produtos ativos e estoque baixo calculados a partir de produtos e pedidos reais.
- **Configurações**: campos de hero, promoção, newsletter e CTA salvam e refletem no site.

## Falhas confirmadas
1. **Clientes sem backend** — a tela lê apenas de um armazenamento local do navegador (`customersStore`), com base inicial vazia. A tabela `customers` existe no banco mas está com 0 registros e nunca é lida nem gravada. Resultado: painel sempre vazio, KPIs zerados, exportação CSV vazia, e nada aparece em outro dispositivo.
2. **Marketing sem backend** — leads/newsletter também vêm do navegador (`md_leads_v1`); a aba **Cupons** é apenas um placeholder sem nenhuma função.
3. **Configurações presas ao dispositivo** — o conteúdo da home é salvo somente no navegador do admin; quem abre o site em outro aparelho vê os textos padrão.
4. **Imagens da home (mídia) não persistidas** — `site_media` está com 0 registros; confirmar se o painel de mídia realmente grava.
5. **Dashboard: "Leads recentes"** depende do mesmo armazenamento local, então fica vazio.
6. **Controle de acesso sem verificação de administrador** — o painel só exige estar logado; qualquer usuário autenticado (inclusive cliente que criou conta) alcança Dashboard, Produtos, Pedidos e Clientes. Existe `user_roles` com 1 registro, mas o painel não consulta o papel.
7. **Estoque/movimentações** — `stock_movements` está vazio; validar se as baixas de estoque em vendas e ajustes manuais estão sendo registradas.

## Plano de correção

### Fase 1 — Segurança do painel (prioridade)
- Criar guarda de rota para todas as telas administrativas, verificando papel de administrador via `user_roles`/`has_role`, com redirecionamento e mensagem clara para quem não é admin.
- Aplicar a mesma verificação no menu/atalhos do painel.

### Fase 2 — Clientes com dados reais
- Passar a tela de Clientes a ler da tabela `customers` do banco (busca, KPIs, detalhe e CSV).
- Preencher/atualizar clientes automaticamente a partir dos pedidos (nome, e-mail, WhatsApp, total de pedidos, total gasto, última compra), para que a base cresça sozinha conforme as vendas.
- Manter notas e mensagens do cliente salvas no banco.

### Fase 3 — Marketing real
- Criar tabelas de **leads** e **cupons** com as devidas permissões de acesso.
- Captura de newsletter/popup passa a gravar no banco (mantendo compatibilidade com o que já existe no navegador, migrando na primeira abertura).
- Aba Cupons ganha criação/edição (código, tipo de desconto, valor, validade, uso máximo, ativo) e o cupom passa a valer no checkout.

### Fase 4 — Configurações e mídia compartilhadas
- Persistir o conteúdo da home e as imagens de categoria/vitrine no banco, com leitura pública, para valer em qualquer dispositivo.
- Verificar e corrigir a gravação de mídia (`site_media`) e o registro de movimentações de estoque.

### Fase 5 — Teste ponta a ponta
- Percorrer cada tela do painel (Dashboard, Produtos, Pedidos, Clientes, Marketing, Configurações) em desktop e mobile, testando cada botão, filtro e formulário, e corrigir o que falhar.

## Notas técnicas
- Guarda admin: rota de layout administrativa com `beforeLoad` + verificação server-side do papel; políticas do banco continuam sendo a defesa real.
- Novas tabelas (`leads`, `coupons`) com RLS: leitura/escrita de admin autenticado, inserção pública apenas para captura de lead.
- Clientes derivados de pedidos via função no banco (chamada no fluxo de pagamento aprovado), evitando duplicidade por e-mail/telefone.
- Configurações da home migram de `localStorage` para tabela de conteúdo com leitura pública e escrita restrita a admin.
