# Fazer o "Participa da promoção" valer de verdade no checkout

## O que está acontecendo
Existem hoje duas listas separadas:
- a caixa **"Participa da promoção"** na peça;
- a lista de produtos dentro da campanha **"Vestidos selecionados"** (R$ 439,90, 10 vagas), que hoje tem 31 peças.

O checkout só olha a **lista da campanha**. Por isso, desmarcar a caixa na peça não tira a peça do desconto. O vestido "Capa Lateral e Flor Aplicada" do print está nas duas listas, então recebe o desconto.

## O que vou fazer
1. **Uma única fonte:** ao salvar a peça, a caixa "Participa da promoção" passa a incluir ou retirar a peça da campanha ativa. Ela abre marcada só se a peça estiver mesmo na campanha.
2. **Cadastro de peça nova:** mesma caixa, desmarcada por padrão.
3. **Lista de produtos do painel:** etiqueta "Participa" ou "Não participa", lida da campanha.
4. **Tela de Promoções:** continua sendo possível marcar e desmarcar as peças ali. As duas telas vão mostrar sempre a mesma coisa.
5. **Não mexo** no valor, nas vagas nem no cálculo do checkout. Eles já seguem a campanha.

## Para você conferir depois
Desmarque a caixa no vestido do print, salve e abra o checkout de novo. O total deve voltar para R$ 800,00.

## Detalhes técnicos
- `ProductForm` e `ProductRegistration`: depois de salvar, chamam `set_product_campaigns(product_id, ativo ? [campanhaAtiva] : [])`. O estado inicial vem de `promotions.product_ids`.
- `supaProducts`: `in_promotion` passa a ser calculado a partir da campanha. `promotion_eligible` é mantido igual só por compatibilidade.
- `produtos.index.tsx`: etiqueta que cruza o produto com o `product_ids` da campanha ativa.
- Sem migração no banco.
