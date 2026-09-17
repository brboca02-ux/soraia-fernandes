# Concluir integração InfinitePay (handle soraia-cristina-4n6)

A base já existe: o servidor monta o link de pagamento da InfinitePay com o valor real do pedido e confirma o pagamento via verificação pública. Falta terminar a experiência do cliente no checkout e na página de sucesso. O código de referência que você colou chegou corrompido (misturado com HTML), então vou aplicar as mudanças diretamente nos arquivos do projeto.

## O que será feito

### 1. Checkout — etapa de pagamento simplificada (segue seu código)
- Remover a escolha manual Pix / Cartão / Boleto: a InfinitePay oferece essas opções na própria tela dela.
- Nova seção "Pagamento seguro" (conforme seu layout): cartão "Pague com InfinitePay — Oficial", selo "Ambiente Seguro" (cadeado), texto explicando o redirecionamento e os meios aceitos: Pix (aprovação instantânea), Cartão em até 12x, InfinitePay Checkout.
- Gravar o pedido com `payment_method: "infinitepay"`.
- Mensagens de progresso: "Gerando link de pagamento InfinitePay…" e "Redirecionando para pagamento seguro…".
- Fluxo mantido: cria pedido → servidor gera link → redireciona para `checkout.infinitepay.io/soraia-cristina-4n6`.

### 2. Página de sucesso — confirmar o retorno da InfinitePay
- Ao voltar, a URL traz `transaction_nsu` e `slug`: a página chama a verificação no servidor e marca o pedido como pago automaticamente.
- Trocar textos/botão "Mercado Pago" por "InfinitePay".
- Manter atualização em tempo real do status como fallback.

### 3. Verificação
- Typecheck + build sem erros.
- Teste no navegador: sacola → checkout → link gerado aponta para o handle `soraia-cristina-4n6` com o total correto; página de sucesso processa o retorno.

## Detalhes técnicos
- `src/routes/checkout.tsx`: remover estado `paymentMethod` e os 3 botões; inserir a seção "Pagamento seguro"; `payment_method: "infinitepay"` no `createOrder`; ajustar o payload de `payment.createPayment` para a assinatura atual do adapter (sem `method`/`siteUrl` extras — o adapter já resolve a URL do site).
- `src/routes/pedido.sucesso.$numero.tsx`: `validateSearch` com `transaction_nsu` e `slug`; chamar `checkInfinitePayPayment` quando presentes; textos atualizados.
- Nenhuma chave secreta necessária: checkout por link usa só o handle público; confirmação via endpoint público `payment_check` com validação de valor contra o banco.
