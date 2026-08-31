"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus, OrderType } from "@/lib/types";

const PICKUP_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "received", label: "Commande reçue" },
  { status: "accepted", label: "Acceptée" },
  { status: "preparing", label: "En préparation" },
  { status: "ready", label: "Prête" },
];

const DELIVERY_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "received", label: "Commande reçue" },
  { status: "accepted", label: "Acceptée" },
  { status: "preparing", label: "En préparation" },
  { status: "delivering", label: "En livraison" },
  { status: "delivered", label: "Livrée" },
];

/** Une commande terminée vaut pour l'étape finale du parcours. */
const RANK: Record<OrderStatus, number> = {
  received: 0, accepted: 1, preparing: 2, ready: 3,
  delivering: 3, completed: 4, delivered: 4, cancelled: -1,
};

export function OrderTimeline({ status, orderType }: { status: OrderStatus; orderType: OrderType }) {
  const steps = orderType === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
  const current = RANK[status];

  if (status === "cancelled") {
    return (
      <p className="rounded-card bg-rosso-50 px-4 py-3 text-sm font-semibold text-rosso-700">
        Cette commande a été annulée. Contactez le restaurant pour en savoir plus.
      </p>
    );
  }

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const rank = RANK[step.status];
        const done = current > rank || (current === 4 && index === steps.length - 1);
        const active = current === rank;
        const last = index === steps.length - 1;

        return (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  done || active
                    ? "border-basil-600 bg-basil-600 text-white"
                    : "border-line bg-white text-ink-muted",
                  active && !done ? "animate-pulse-ring border-rosso-600 bg-rosso-600" : "",
                )}
              >
                {done ? <Check className="size-4" aria-hidden /> : <span className="text-xs font-bold">{index + 1}</span>}
              </span>
              {!last ? (
                <span className={cn("w-0.5 flex-1 min-h-6", done ? "bg-basil-600" : "bg-line")} />
              ) : null}
            </div>
            <div className={cn("pb-6", last && "pb-0")}>
              <p className={cn("text-[15px] font-semibold", done || active ? "text-ink" : "text-ink-muted")}>
                {step.label}
              </p>
              {active ? (
                <p className="text-[13px] text-ink-soft">Étape en cours</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
