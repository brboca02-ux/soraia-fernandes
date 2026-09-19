// Adapter de entrega.
// A loja trabalha somente com retirada presencial em Joinville/SC.
// Não existe frete, entrega por Uber ou frete grátis.

export interface ShippingQuote {
  code: string;
  name: string;
  price: number;
  days: number;
  description?: string;
  carrier?: string;
}

export interface ShippingQuoteInput {
  cep: string;
  subtotal: number;
  itemsCount: number;
  city?: string;
  state?: string;
}

export interface ShippingProvider {
  name: string;
  quote(input: ShippingQuoteInput): Promise<ShippingQuote[]>;
}

export const StoreShippingProvider: ShippingProvider = {
  name: "retirada-na-loja",

  async quote() {
    return [
      {
        code: "retirada",
        name: "Retirada na loja (Joinville/SC)",
        price: 0,
        days: 1,
        description:
          "Pronto em até 24h úteis. O endereço e as instruções para retirada serão informados após o pedido.",
      },
    ];
  },
};

export const shipping: ShippingProvider = StoreShippingProvider;