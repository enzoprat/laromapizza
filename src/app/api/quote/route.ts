import { NextResponse } from "next/server";
import { z } from "zod";
import { getRestaurantBySlug, getStatusFor, getZones } from "@/lib/repo/restaurants";
import { priceCart, PriceError } from "@/lib/orders/price";
import { resolveSchedule } from "@/lib/orders/schedule";
import { cartLineSchema } from "@/lib/security/validation";
import { findMatchingZone } from "@/lib/domain/zones";

export const dynamic = "force-dynamic";

const schema = z.object({
  restaurant: z.string().min(1).max(60),
  orderType: z.enum(["pickup", "delivery"]),
  scheduledFor: z.string().datetime().nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  postalCode: z.string().max(10).nullable().optional(),
  lines: z.array(cartLineSchema).max(40),
});

/**
 * Chiffrage du panier par le serveur : totaux, promotions appliquées et
 * minimum de commande. C'est cette réponse — jamais un calcul du navigateur —
 * qui est affichée au client.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const { restaurant: slug, orderType, scheduledFor, lines, city, postalCode } = parsed.data;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant || !restaurant.is_active) {
    return NextResponse.json({ error: "Établissement introuvable." }, { status: 404 });
  }

  if (!lines.length) {
    return NextResponse.json({
      lines: [], itemsTotal: 0, discountTotal: 0, deliveryFee: 0, total: 0,
      applied: [], minimumOrder: 0, meetsMinimum: true,
    });
  }

  const { hours, closures } = await getStatusFor(restaurant.id);
  const schedule = await resolveSchedule({
    restaurant, hours, closures, orderType,
    requested: scheduledFor ?? null,
    asap: !scheduledFor,
  });

  // Un chiffrage ne doit pas échouer parce que le restaurant est fermé : on
  // affiche quand même le panier, la contrainte d'horaire est traitée au
  // moment de valider la commande.
  const scheduledAt = "at" in schedule ? schedule.at : new Date();

  // Minimum et frais éventuellement spécifiques à la zone de livraison.
  let minimumOverride: number | null = null;
  let deliveryFeeOverride: number | null = restaurant.delivery_fee;
  if (orderType === "delivery") {
    const zones = await getZones(restaurant.id);
    const zone = city || postalCode ? findMatchingZone(zones, city ?? "", postalCode ?? "") : null;
    const isLunch = scheduledAt.getHours() < 16;
    minimumOverride = zone?.min_order ?? (isLunch ? restaurant.delivery_min_lunch : restaurant.delivery_min_dinner);
    deliveryFeeOverride = zone?.delivery_fee ?? restaurant.delivery_fee;
  }

  try {
    const breakdown = await priceCart({
      restaurantId: restaurant.id,
      orderType,
      scheduledFor: scheduledAt,
      lines,
      hours,
      deliveryFeeOverride,
      minimumOverride,
    });

    // Le service réel (midi/soir) prime sur l'approximation ci-dessus.
    const minimum =
      orderType === "delivery"
        ? (breakdown.service === "midi" ? restaurant.delivery_min_lunch : restaurant.delivery_min_dinner)
        : 0;
    const afterDiscount = breakdown.itemsTotal - breakdown.discountTotal;

    return NextResponse.json({
      ...breakdown,
      scheduledFor: scheduledAt.toISOString(),
      minimumOrder: minimumOverride ?? minimum,
      meetsMinimum: orderType !== "delivery" || afterDiscount >= (minimumOverride ?? minimum),
    });
  } catch (error) {
    if (error instanceof PriceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    console.error("[quote]", error);
    return NextResponse.json({ error: "Impossible de calculer le panier." }, { status: 500 });
  }
}
