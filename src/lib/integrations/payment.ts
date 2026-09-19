// Adapter de pagamento. Implementação ativa: InfinitePay (checkout por link).
// O valor é validado no servidor a partir do pedido gravado no banco.

import { createInfinitePayCheckout } from "./infinitepay.functions";

// Mantido por compatibilidade com pedidos antigos gravados no banco.
export type PaymentMethod = "infinitepay" | "pix" | "cartao" | "boleto";

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  customer: { name: string; email: string; cpf?: string; phone?: string };
}

export interface CreatePaymentResult {
  provider: string;
  paymentId: string;
  paymentUrl?: string;
}

export interface PaymentProvider {
  name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
}

function currentSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://soraiafernandesmodafesta.com.br";
}

export const InfinitePayProvider: PaymentProvider = {
  name: "infinitepay",
  async createPayment(input) {
    return await createInfinitePayCheckout({
      data: {
        orderNumber: input.orderNumber,
        siteUrl: currentSiteUrl(),
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone,
        },
      },
    });
  },
};

export const payment: PaymentProvider = InfinitePayProvider;
