# Concluir integração InfinitePay (handle soraia-cristina-4n6)

A base já existe: o servidor monta o link de pagamento da InfinitePay com o valor real do pedido e confirma o pagamento via verificação pública. Falta terminar a experiência do cliente no checkout e na página de sucesso.

## O que será feito

### 1. Checkout — simplificar a etapa de pagamento
- Remover a escolha manual entre Pix / Cartão / Boleto: a InfinitePay oferece essas opções na própria tela de pagamento dela.
- Mostrar um bloco único "Pague com InfinitePay" informando que o cliente poderá escolher Pix ou cartão com segurança na tela seguinte.
- Gravar o pedido com método de pagamento `infinitepay`.
- Fluxo atual mantido: cria o pedido → gera o link no servidor → redireciona o cliente para `checkout.infinitepay.io/soraia-cristina-4n6`.

### 2. Página de sucesso do pedido — confirmar o retorno da InfinitePay
- Ao voltar da InfinitePay, a URL traz `transaction_nsu` e `slug`: a página chama a verificação no servidor e, se confirmado, o pedido é marcado como pago automaticamente.
- Trocar os textos e o botão "Pagar com Mercado Pago" por "Pagar com InfinitePay".
- Manter polling/atualização em tempo real do status como fallback.

### 3. Verificação
- Typecheck + build sem erros.
- Teste no navegador: montar sacola → checkout → confirmar que o link gerado aponta para o handle `soraia-cristina-4n6` com o total correto, e que a página de sucesso processa o retorno.

## Detalhes técnicos
- `src/routes/checkout.tsx`: remover estado `paymentMethod` e a seção de 3 botões; `payment_method: "infinitepay"` no `createOrder`.
- `src/routes/pedido.sucesso.$numero.tsx`: estender `validateSearch` com `transaction_nsu` e `slug`; chamar `checkInfinitePayPayment` (de `src/lib/integrations/infinitepay.functions.ts`) quando presentes; ajustar textos de Mercado Pago para InfinitePay.
- Nenhuma chave secreta necessária: o checkout por link usa apenas o handle público; a confirmação usa o endpoint público `payment_check` com validação de valor contra o banco.
