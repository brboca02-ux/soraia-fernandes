import { Check, Package, PackageCheck, Truck, MapPin, Home, Store, Send } from "lucide-react";
import {
  FULFILLMENT_FLOW,
  FULFILLMENT_LABEL,
  type FulfillmentStage,
} from "@/lib/api/orderTracking";

const ICONS: Record<FulfillmentStage, typeof Package> = {
  recebido: Package,
  embalado: PackageCheck,
  pronto_retirada: Store,
  coletado: MapPin,
  enviado: Send,
  em_transito: Truck,
  entregue: Home,
};

/** Timeline horizontal (desktop) / vertical (mobile) das etapas. */
export function FulfillmentStepper({
  current,
  paid,
}: {
  current: FulfillmentStage | null;
  /** Só faz sentido depois de pago; antes disso mostra tudo desabilitado. */
  paid: boolean;
}) {
  const currentIdx = current ? FULFILLMENT_FLOW.indexOf(current) : -1;

  return (
    <ol className={`grid gap-2 sm:gap-4 grid-cols-${FULFILLMENT_FLOW.length}`} style={{ gridTemplateColumns: `repeat(${FULFILLMENT_FLOW.length}, minmax(0, 1fr))` }}>
      {FULFILLMENT_FLOW.map((stage, i) => {
        const done = paid && currentIdx >= i;
        const isCurrent = paid && currentIdx === i;
        const Icon = ICONS[stage];
        return (
          <li key={stage} className="flex flex-col items-center text-center">
            <div
              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border-2 transition ${
                done
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border"
              } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span
              className={`mt-2 text-[10px] sm:text-xs font-medium leading-tight ${
                done ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {FULFILLMENT_LABEL[stage]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
