// Mercado Pago Card Payment Brick — checkout transparente.
// Carrega o SDK v2 no browser, monta o brick no container e chama
// onTokenReady quando o cliente conclui o formulário. O componente
// pai é responsável por criar o pedido, enviar o token ao servidor
// e navegar após a confirmação.

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMpPublicKey } from "@/lib/integrations/mercadopago-card.functions";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MercadoPago?: any;
  }
}

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar SDK MP")));
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar SDK MP"));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export interface CardBrickFormData {
  token: string;
  installments: number;
  payment_method_id: string;
  issuer_id?: string;
  payer: {
    email?: string;
    identification?: { type: string; number: string };
  };
}

interface Props {
  amount: number;
  payerEmail?: string;
  onSubmit: (data: CardBrickFormData) => Promise<void>;
  disabled?: boolean;
}

export function CardBrickPayment({ amount, payerEmail, onSubmit, disabled }: Props) {
  const containerId = "mp-card-brick-container";
  const controllerRef = useRef<{ unmount: () => void } | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { publicKey } = await getMpPublicKey();
        if (cancelled) return;
        await loadSdk();
        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mp = new (window.MercadoPago as any)(publicKey, { locale: "pt-BR" });
        const bricks = mp.bricks();

        const settings = {
          initialization: {
            amount,
            payer: payerEmail ? { email: payerEmail } : undefined,
          },
          customization: {
            visual: {
              style: {
                theme: "default" as const,
                customVariables: {
                  formPadding: "0px",
                  formInputsTextSize: "15px",
                  inputVerticalPadding: "10px",
                  inputHorizontalPadding: "12px",
                  textPrimaryWeight: "500",
                  fontSizeExtraSmall: "11px",
                  fontSizeSmall: "12px",
                  fontSizeMedium: "14px",
                  fontSizeLarge: "16px",
                  borderRadiusMedium: "8px",
                  borderRadiusLarge: "10px",
                },
              },
              hidePaymentButton: false,
            },
            paymentMethods: { maxInstallments: 12 },
          },
          callbacks: {
            onReady: () => setReady(true),
            onError: (err: unknown) => {
              console.warn("brick error:", err);
            },
            onSubmit: (arg: CardBrickFormData | { formData: CardBrickFormData }) => {
              // Card Payment Brick entrega formData direto; Payment Brick envolve em { formData }.
              const formData =
                (arg as { formData?: CardBrickFormData })?.formData ?? (arg as CardBrickFormData);
              return new Promise<void>((resolve, reject) => {
                if (!formData?.token) {
                  const err = new Error("Dados do cartão incompletos");
                  toast.error(err.message);
                  reject(err);
                  return;
                }
                onSubmitRef.current(formData)
                  .then(() => resolve())
                  .catch((e) => {
                    toast.error((e as Error).message || "Falha ao processar o cartão");
                    reject(e);
                  });
              });
            },
          },
        };

        const controller = await bricks.create("cardPayment", containerId, settings);
        if (cancelled) {
          controller?.unmount?.();
          return;
        }
        controllerRef.current = controller;
      } catch (e) {
        console.error(e);
        if (!cancelled) setError((e as Error).message || "Não foi possível carregar o pagamento");
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current?.unmount?.();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      {!ready && !error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando pagamento seguro…
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive py-3">
          {error}. Recarregue a página e tente novamente.
        </div>
      )}
      <div id={containerId} className="w-full max-w-full overflow-x-hidden [&_iframe]:!w-full [&_iframe]:max-w-full" />
    </div>
  );
}
