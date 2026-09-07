// Adapter de pagamento. Implementação ativa: Mercado Pago (Checkout Pro).
// A criação da preference roda no server (server function), mantendo o
// MP_ACCESS_TOKEN fora do bundle do client.

import { createMpPreference } from "./mercadopago.functions";

export type PaymentMethod = "pix" | "cartao" | "boleto";

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  customer: { name: string; email: string; cpf?: string; phone?: string };
}

export interface CreatePaymentResult {
  provider: string;
  paymentId: string;
  paymentUrl?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pixCopyPaste?: string;
  boletoUrl?: string;
}

export interface PaymentProvider {
  name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
}

function currentSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://www.soraiafernandes.com.br";
}

export const MercadoPagoProvider: PaymentProvider = {
  name: "mercadopago",
  async createPayment(input) {
    const result = await createMpPreference({
      data: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        amount: input.amount,
        method: input.method,
        siteUrl: currentSiteUrl(),
        customer: input.customer,
      },
    });
    return {
      provider: result.provider,
      paymentId: result.paymentId,
      paymentUrl: result.paymentUrl,
    };
  },
};

export const payment: PaymentProvider = MercadoPagoProvider;
