# Pagamento pela InfinitePay (handle soraia-cristina-4n6)

O checkout do site passa a enviar o cliente para a página de pagamento da InfinitePay da loja, com Pix, cartão e boleto conforme o que estiver habilitado na conta. O meio de pagamento anterior sai do site.

## Como fica para o cliente

1. Cliente preenche dados e endereço no checkout, como hoje.
2. Ao clicar em finalizar, o pedido é gravado e ele vai para a página segura de pagamento da InfinitePay com o valor e os itens do pedido.
3. Depois de pagar, volta automaticamente para a página de sucesso do pedido no site.
4. O site confere o pagamento junto à InfinitePay e marca o pedido como pago. Enquanto não confirmar, o pedido fica como "aguardando pagamento".

## O que muda nas telas

- Some a escolha manual de Pix/Cartão/Boleto e o modal de QR Code Pix do site: a escolha passa a acontecer dentro da página da InfinitePay.
- O botão de finalizar passa a indicar "Ir para o pagamento seguro".
- Página de sucesso passa a mostrar "confirmando pagamento" enquanto a checagem acontece, e depois "pagamento confirmado".

## Detalhes técnicos

- Nova função de servidor `src/lib/integrations/infinitepay.functions.ts`:
  - `createInfinitePayCheckout`: lê o total real do pedido no banco (nunca do cliente), monta o link `https://checkout.infinitepay.io/soraia-cristina-4n6` com `items` (nome, quantidade, preço em centavos), `order_nsu` = `order_number`, `redirect_url` para `/pedido/sucesso/$numero`.
  - `checkInfinitePayPayment`: chama o endpoint público de verificação da InfinitePay (`payment_check`) com `handle`, `transaction_nsu` e `external_order_nsu`; só marca `pago` se o valor confirmado bater com o total do pedido.
- `src/lib/integrations/payment.ts` passa a apontar para a InfinitePay; adaptador do Mercado Pago deixa de ser usado.
- `src/routes/checkout.tsx`: remove seleção de método, fluxo Pix embutido e o brick de cartão; grava o pedido e redireciona para o link da InfinitePay.
- `src/routes/pedido.sucesso.$numero.tsx`: lê os parâmetros de retorno (`transaction_nsu`, `receipt_url`, `slug`), chama a verificação e atualiza o status via a RPC de pagamento já existente.
- Arquivos do Mercado Pago (`mercadopago*.functions.ts`, `CardBrickPayment.tsx`, webhook) ficam desconectados do fluxo e são removidos; a coluna de provedor passa a gravar `infinitepay`.
- Sem segredos novos: o fluxo usa apenas o handle público e a verificação pública de transação.

## Limitações

- A confirmação depende do retorno do cliente à página de sucesso ou de uma nova checagem ao abrir o pedido; a InfinitePay não envia webhook nesse modo sem credenciais de API. Se depois você gerar credenciais no painel, dá para adicionar confirmação automática.
