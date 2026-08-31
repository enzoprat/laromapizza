"use client";

import { Bike, ShoppingBag, ChevronRight } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import type { OrderType } from "@/lib/types";
import { formatPrice } from "@/lib/domain/money";

export function ModeChooser({
  restaurant,
  onChoose,
}: {
  restaurant: Restaurant;
  onChoose: (type: OrderType) => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h2 className="font-display text-2xl font-bold leading-tight text-ink">
        Comment souhaitez-vous récupérer votre commande&nbsp;?
      </h2>

      <div className="mt-6 space-y-3">
        {restaurant.pickup_enabled ? (
          <button
            type="button"
            onClick={() => onChoose("pickup")}
            className="flex w-full items-center gap-4 rounded-card border-2 border-line bg-white p-4 text-left transition-all duration-200 hover:border-rosso-600 hover:bg-rosso-50 active:scale-[0.99]"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-rosso-600 text-white">
              <ShoppingBag className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold text-ink">Click &amp; Collect</span>
              <span className="block text-[13px] leading-snug text-ink-soft">
                Prêt en {restaurant.prep_time_min} min · {restaurant.street}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden />
          </button>
        ) : null}

        {restaurant.delivery_enabled ? (
          <button
            type="button"
            onClick={() => onChoose("delivery")}
            className="flex w-full items-center gap-4 rounded-card border-2 border-line bg-white p-4 text-left transition-all duration-200 hover:border-basil-600 hover:bg-basil-50 active:scale-[0.99]"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-basil-600 text-white">
              <Bike className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold text-ink">Livraison</span>
              <span className="block text-[13px] leading-snug text-ink-soft">
                Environ {restaurant.delivery_time_min} min · livraison offerte ·
                minimum {formatPrice(restaurant.delivery_min_dinner)} le soir
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden />
          </button>
        ) : null}
      </div>

      <p className="mt-6 text-center text-[13px] text-ink-muted">
        Paiement sur place ou à la livraison — espèces, carte bancaire et titres restaurant.
      </p>
    </div>
  );
}
