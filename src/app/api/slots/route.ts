import { NextResponse } from "next/server";
import { getRestaurantBySlug, getStatusFor } from "@/lib/repo/restaurants";
import { buildSlots } from "@/lib/orders/schedule";

export const dynamic = "force-dynamic";

/** Créneaux réellement proposables pour un établissement et un mode de retrait. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("restaurant");
  const orderType = url.searchParams.get("type") === "delivery" ? "delivery" : "pickup";
  if (!slug) return NextResponse.json({ error: "Établissement manquant." }, { status: 400 });

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant || !restaurant.is_active) {
    return NextResponse.json({ error: "Établissement introuvable." }, { status: 404 });
  }

  const { hours, closures, status } = await getStatusFor(restaurant.id);
  const days = await buildSlots(restaurant, hours, closures, orderType);

  return NextResponse.json({
    acceptingOrders: restaurant.accepting_orders,
    isOpen: status.isOpen,
    nextOpening: status.nextOpening?.label ?? null,
    leadMinutes: orderType === "delivery" ? restaurant.delivery_time_min : restaurant.prep_time_min,
    days: days.map((d) => ({
      key: d.key,
      label: d.label,
      slots: d.slots.map((s) => ({ at: s.at.toISOString(), label: s.label, available: s.available })),
    })),
  });
}
