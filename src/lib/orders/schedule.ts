import "server-only";
import { generateSlots, firstAvailableSlot, type Closure, type OpeningHour } from "../domain/opening";
import { getSlotLoad } from "../repo/orders";
import type { Restaurant, OrderType } from "../types";

/** Délai avant qu'une commande soit prête : préparation, plus la course en livraison. */
export function leadMinutesFor(restaurant: Restaurant, orderType: OrderType): number {
  return orderType === "delivery" ? restaurant.delivery_time_min : restaurant.prep_time_min;
}

export async function buildSlots(
  restaurant: Restaurant,
  hours: OpeningHour[],
  closures: Closure[],
  orderType: OrderType,
  now = new Date(),
) {
  const from = now;
  const to = new Date(now.getTime() + 3 * 24 * 3600_000);
  const load = await getSlotLoad(restaurant.id, from, to);

  return generateSlots({
    hours,
    closures,
    leadMinutes: leadMinutesFor(restaurant, orderType),
    intervalMinutes: restaurant.slot_interval_min,
    capacity: restaurant.slot_capacity,
    load,
    daysAhead: 2,
    now,
  });
}

/**
 * Valide le créneau demandé. Le client peut proposer une heure, mais c'est le
 * serveur qui décide : un créneau fermé, passé ou complet est refusé.
 */
export async function resolveSchedule(opts: {
  restaurant: Restaurant;
  hours: OpeningHour[];
  closures: Closure[];
  orderType: OrderType;
  requested?: string | null;
  asap?: boolean;
  now?: Date;
}): Promise<{ at: Date; asap: boolean } | { error: string }> {
  const { restaurant, hours, closures, orderType, requested, asap, now = new Date() } = opts;
  const days = await buildSlots(restaurant, hours, closures, orderType, now);
  const flat = days.flatMap((d) => d.slots);

  if (!flat.some((s) => s.available)) {
    return { error: "Aucun créneau n'est disponible pour le moment." };
  }

  if (asap || !requested) {
    const first = firstAvailableSlot(days);
    if (!first) return { error: "Aucun créneau n'est disponible pour le moment." };
    return { at: first.at, asap: true };
  }

  const requestedTime = new Date(requested).getTime();
  if (Number.isNaN(requestedTime)) return { error: "Heure demandée invalide." };

  const match = flat.find((s) => s.at.getTime() === requestedTime);
  if (!match) return { error: "Ce créneau n'est plus proposé. Merci d'en choisir un autre." };
  if (!match.available) return { error: "Ce créneau vient d'être complet. Merci d'en choisir un autre." };

  return { at: match.at, asap: false };
}
