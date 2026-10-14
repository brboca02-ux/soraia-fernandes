# Plano completo — promoções seletivas por produto

## Objetivo
Permitir que cada produto seja marcado como **participante** ou **fora da promoção**, tanto no cadastro quanto na lista administrativa. A administração poderá alterar a campanha sem mexer no código, escolhendo:

- desconto percentual geral;
- preço fixo geral;
- preço promocional individual por produto;
- data/hora de início e término;
- valor mínimo de produtos participantes no carrinho.

Cupons valerão somente para produtos participantes e **não acumularão** com a campanha: o sistema aplicará o maior desconto entre campanha e cupom.

## Comportamento definido

1. Todo produto novo começa com **“Participa da promoção” desmarcado**.
2. Na migração, produtos existentes com `sale_price` válido serão marcados como participantes para preservar as ofertas já publicadas; os demais ficarão fora.
3. Somente produtos marcados entram na coleção “Promoções” e recebem selo/preço promocional.
4. A campanha só vale quando estiver ativa, dentro das datas e quando o subtotal dos itens participantes atingir o mínimo configurado.
5. Modos de desconto:
   - **Percentual geral:** reduz o preço normal de cada participante pelo percentual configurado.
   - **Preço fixo geral:** cada participante fica no valor configurado, sem permitir preço acima do preço normal.
   - **Preço por produto:** usa o `sale_price` cadastrado em cada participante; produtos sem valor promocional válido permanecem no preço normal e mostram aviso no painel.
6. Produto não participante sempre mantém o preço normal, mesmo que possua um `sale_price` antigo.
7. Cupom é calculado somente sobre o subtotal dos produtos participantes.
8. Campanha e cupom não se somam. O pedido usa `max(desconto_da_campanha, desconto_do_cupom)`.
9. O preço enviado pelo navegador nunca será aceito como fonte de verdade; o banco recalculará produto, elegibilidade, campanha, cupom e total no momento do pedido.

## Etapas de implementação

### 1. Estrutura de dados e migração segura

Criar e aplicar uma nova migração pelo Lovable Cloud:

- adicionar `promotion_eligible boolean NOT NULL DEFAULT false` em `public.products`;
- marcar como participantes os produtos existentes cujo `sale_price` seja maior que zero e menor que `price`;
- manter os GRANTs e políticas atuais da tabela, sem abrir novas permissões;
- criar a configuração `site_config.key = 'promotion'` com um JSON contendo:
  - `enabled`;
  - `mode: 'percentage' | 'fixed_price' | 'per_product'`;
  - `percentage`;
  - `fixedPrice`;
  - `startsAt`;
  - `endsAt`;
  - `minimumEligibleSubtotal`;
- atualizar a função `place_order(payload)` para calcular a promoção e o cupom no banco;
- criar uma função pública de cotação do carrinho, somente leitura, que aplique exatamente a mesma regra e devolva subtotal normal, subtotal elegível, desconto da campanha, desconto do cupom escolhido, frete e total;
- validar limites: percentual entre 0 e 100, valores não negativos, fim posterior ao início e preço final nunca negativo.

**Arquivos envolvidos**
- nova migration em `supabase/migrations/`;
- `docs/sql/security-hardening-2026.sql`, para manter a versão documentada de `place_order` sincronizada;
- `src/integrations/supabase/types.ts`, regenerado após a migração.

### 2. Um único motor de regras para apresentação

Criar um módulo central de promoção para evitar fórmulas espalhadas:

- tipos da campanha;
- normalização segura da configuração salva;
- verificação de campanha ativa por data;
- cálculo do preço exibido para um produto;
- cálculo do desconto elegível e comparação campanha × cupom;
- mensagens de motivo quando a promoção não se aplica.

A mesma semântica será reproduzida na função do banco. Testes automatizados cobrirão arredondamento, datas, compra mínima, preço fixo acima do preço normal, produto não participante, cupom e não acúmulo.

**Arquivos envolvidos**
- novo `src/lib/promotions.ts`;
- novo `src/lib/promotions.test.ts`;
- `src/lib/siteConfig.ts`, separando a configuração da campanha da configuração visual da home sem quebrar os dados atuais.

### 3. Cadastro e edição de produto

Adicionar no formulário principal:

- chave **“Participa da promoção”**;
- explicação curta de que a regra ativa do painel será aplicada;
- campo “Preço promocional individual” habilitado/obrigatório somente quando a campanha estiver no modo por produto;
- validação para impedir preço promocional zero, negativo ou maior/igual ao preço normal nesse modo.

Adicionar o mesmo controle ao cadastro rápido com IA, sempre desmarcado por padrão.

Ao duplicar um produto, copiar explicitamente sua participação e seu preço promocional para evitar comportamento implícito.

**Arquivos envolvidos**
- `src/components/ProductForm.tsx`;
- `src/routes/produtos.rapido.tsx`;
- `src/stores/productsStore.ts`;
- `src/lib/api/supaProducts.ts`.

### 4. Gestão rápida na lista de produtos

Na lista administrativa:

- incluir filtro **Todos / Participam / Não participam**;
- exibir selo claro “Promoção” ou “Preço normal” no desktop e celular;
- permitir alternar a participação diretamente na lista;
- exibir alerta quando o modo “preço por produto” estiver ativo e um participante não tiver `sale_price` válido;
- manter edição, duplicação, arquivamento e vitrine independentes da promoção.

**Arquivo envolvido**
- `src/routes/produtos.index.tsx`.

### 5. Editor das regras no painel administrativo

Substituir a configuração promocional apenas textual por uma seção funcional:

- ativar/pausar campanha;
- escolher percentual, preço fixo ou preço por produto;
- editar o valor correspondente;
- definir início e fim;
- definir compra mínima dos itens participantes;
- visualizar um resumo da regra antes de salvar;
- validar os campos e mostrar confirmação de salvamento;
- manter título e subtítulo da faixa promocional editáveis.

O cupom continuará no painel de Marketing, mas a tela informará claramente: “válido somente em produtos participantes e não cumulativo”.

**Arquivos envolvidos**
- `src/routes/admin.tsx`;
- `src/routes/marketing.index.tsx`;
- `src/lib/siteConfig.ts`.

### 6. Vitrine, coleção e página do produto

Atualizar a transformação e as telas para carregarem participação, preço normal e preço efetivo:

- coleção “Promoções” filtra por `promotion_eligible` e campanha ativa, não apenas por `sale_price`;
- cards mostram preço normal riscado, preço final e selo somente quando há desconto real;
- página do produto mostra a regra aplicada e parcelamento calculado sobre o preço final;
- carrinho preserva os identificadores reais, mas recalcula a cotação ao abrir o checkout;
- quando a campanha estiver fora da data ou abaixo do mínimo, nenhum preço promocional enganoso será mostrado como total confirmado.

**Arquivos envolvidos**
- `src/lib/mockProducts.ts`;
- `src/lib/shopify.ts`;
- `src/components/ProductGrid.tsx`;
- `src/components/ProductCard.tsx`;
- `src/routes/produto.$handle.tsx`;
- `src/components/CartDrawer.tsx`;
- `src/lib/collections.ts`;
- possíveis chamadas em `src/components/HomeSections.tsx` e `src/components/PromoSections.tsx` apenas para refletir status e período da campanha.

### 7. Checkout, cupom e pedido com cálculo confiável

Remover de `checkout.tsx` o valor fixo `PROMO_PRICE_PER_ITEM = 439.90` e o cálculo local independente.

Novo fluxo:

```text
Carrinho com IDs e quantidades
        ↓
Cotação no banco com regras atuais
        ↓
Checkout exibe preços e desconto confirmados
        ↓
place_order recalcula tudo dentro da transação
        ↓
Pedido grava subtotal, desconto e total finais
        ↓
InfinitePay cobra exatamente o total gravado
```

Detalhes:

- o checkout solicitará nova cotação ao alterar itens, frete ou cupom;
- cupom inválido, expirado ou sem itens participantes terá mensagem específica;
- o uso do cupom só será incrementado quando ele vencer a comparação contra a campanha e for efetivamente aplicado;
- `place_order` repetirá a validação para impedir adulteração de preço;
- `orders.discount` guardará o desconto realmente concedido;
- os itens do pedido preservarão preço normal e quantidade, permitindo auditoria do desconto total;
- carrinhos antigos em armazenamento local serão normalizados pelos IDs reais e recalculados antes de finalizar.

**Arquivos envolvidos**
- `src/routes/checkout.tsx`;
- `src/lib/coupons.ts`;
- `src/lib/api/supaOrders.ts`;
- `src/stores/cartStore.ts`;
- função `public.place_order(jsonb)` na nova migração.

### 8. Compatibilidade com InfinitePay

A integração atual exige que o total seja idêntico à soma bruta dos itens e, por isso, rejeita pedidos com desconto. Ajustar para:

- continuar buscando o pedido diretamente no banco;
- enviar à InfinitePay uma linha consolidada “Pedido {número}” com o valor final já validado, incluindo descontos e frete;
- nunca receber preço do navegador;
- manter a verificação do valor pago contra `orders.total` antes de marcar o pedido como pago.

**Arquivo envolvido**
- `src/lib/integrations/infinitepay.functions.ts`.

### 9. Validação final

Executar e comprovar:

- checagem de tipos e build sem erros;
- testes unitários das regras;
- teste administrativo: criar produto fora da promoção, criar participante e alterar ambos;
- teste dos três modos de campanha;
- teste antes/durante/depois do período;
- teste abaixo e acima da compra mínima;
- carrinho misto com produto participante e não participante;
- cupom somente sobre participantes;
- comparação sem acúmulo, escolhendo o maior desconto;
- coleção, card, produto, carrinho e checkout em celular e desktop;
- criação do pedido e geração do link InfinitePay com o total exato;
- regressão de estoque, pedido, imagens e navegação.

## Critérios de aceite

- Um produto marcado como “não participa” nunca recebe desconto nem entra na coleção promocional.
- O painel altera regra, datas e mínimo sem mudança de código.
- Os três modos produzem o preço esperado.
- Cupom não afeta produtos fora da promoção e nunca acumula com a campanha.
- O valor visível no checkout, gravado no pedido e cobrado pela InfinitePay é o mesmo.
- Alterar a campanha não exige reeditar todos os produtos.
- Produtos novos ficam fora da promoção até decisão explícita do administrador.
