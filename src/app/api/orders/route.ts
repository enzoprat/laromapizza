import { NextResponse } from "next/server";
import { getRestaurantById, getStatusFor, getZones } from "@/lib/repo/restaurants";
import { priceCart, PriceError } from "@/lib/orders/price";
import { resolveSchedule } from "@/lib/orders/schedule";
import { createOrder } from "@/lib/repo/orders";
import { createOrderSchema } from "@/lib/security/validation";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { findMatchingZone } from "@/lib/domain/zones";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Formulaire invalide.", field: first?.path?.[0] }, { status: 400 });
  }
  const input = parsed.data;

  // Piège à robots : le champ caché doit rester vide.
  if (input.website) return NextResponse.json({ error: "Requête refusée." }, { status: 400 });

  // Deux garde-fous : par IP (rafale) et par téléphone (spam ciblé).
  const ip = clientIp(request.headers);
  const [ipOk, phoneOk] = await Promise.all([
    rateLimit(`order:ip:${ip}`, 10, 600),
    rateLimit(`order:phone:${input.phone}`, 4, 900),
  ]);
  if (!ipOk || !phoneOk) {
    return NextResponse.json(
      { error: "Trop de commandes envoyées coup sur coup. Merci de patienter quelques minutes ou de nous appeler." },
      { status: 429 },
    );
  }

  const restaurant = await getRestaurantById(input.restaurantId);
  if (!restaurant || !restaurant.is_active) {
    return NextResponse.json({ error: "Établissement introuvable." }, { status: 404 });
  }
  if (!restaurant.accepting_orders) {
    return NextResponse.json(
      { error: `${restaurant.name} ne prend pas de commande en ligne pour le moment.` },
      { status: 409 },
    );
  }
  if (input.orderType === "delivery" && !restaurant.delivery_enabled) {
    return NextResponse.json({ error: "La livraison n'est pas disponible ici." }, { status: 409 });
  }
  if (input.orderType === "pickup" && !restaurant.pickup_enabled) {
    return NextResponse.json({ error: "Le click & collect n'est pas disponible ici." }, { status: 409 });
  }

  const { hours, closures } = await getStatusFor(restaurant.id);

  // --- créneau : c'est le serveur qui tranche
  const schedule = await resolveSchedule({
    restaurant, hours, closures,
    orderType: input.orderType,
    requested: input.scheduledFor ?? null,
    asap: input.asap,
  });
  if ("error" in schedule) return NextResponse.json({ error: schedule.error }, { status: 409 });

  // --- zone de livraison
  let deliveryZoneId: number | null = null;
  let minimumOverride: number | null = null;
  let deliveryFeeOverride = restaurant.delivery_fee;

  if (input.orderType === "delivery") {
    const zones = await getZones(restaurant.id);
    const zone = findMatchingZone(zones, input.city ?? "", input.postalCode ?? "");
    if (!zone) {
      return NextResponse.json(
        { error: `Cette adresse n'est malheureusement pas desservie par ${restaurant.name}.`, code: "OUT_OF_ZONE" },
        { status: 422 },
      );
    }
    deliveryZoneId = zone.id;
    minimumOverride = zone.min_order;
    deliveryFeeOverride = zone.delivery_fee ?? restaurant.delivery_fee;
  }

  try {
    // --- recalcul intégral : prix, options, suppléments, promotions
    const preliminary = await priceCart({
      restaurantId: restaurant.id,
      orderType: input.orderType,
      scheduledFor: schedule.at,
      lines: input.lines,
      hours,
      deliveryFeeOverride,
      minimumOverride,
    });

    const minimum =
      input.orderType === "delivery"
        ? minimumOverride ??
          (preliminary.service === "midi" ? restaurant.delivery_min_lunch : restaurant.delivery_min_dinner)
        : 0;

    const breakdown = { ...preliminary, minimumOrder: minimum };
    const afterDiscount = breakdown.itemsTotal - breakdown.discountTotal;

    if (input.orderType === "delivery" && afterDiscount < minimum) {
      return NextResponse.json(
        {
          error: `Le minimum de commande en livraison est de ${(minimum / 100).toFixed(2).replace(".", ",")} € ${
            preliminary.service === "midi" ? "le midi" : "le soir"
          }.`,
          code: "BELOW_MINIMUM",
          minimumOrder: minimum,
        },
        { status: 422 },
      );
    }

    const order = await createOrder({
      restaurantId: restaurant.id,
      orderType: input.orderType,
      scheduledFor: schedule.at,
      asap: schedule.asap,
      deliveryZoneId,
      customer: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        email: input.email,
        address: input.address ?? null,
        addressExtra: input.addressExtra ?? null,
        postalCode: input.postalCode ?? null,
        city: input.city ?? null,
        notes: input.notes ?? null,
      },
      breakdown,
      paymentMethod: "on_site",
    });

    return NextResponse.json(
      {
        code: order.code,
        token: order.publicToken,
        scheduledFor: order.scheduledFor,
        total: order.total,
        trackUrl: `/suivi/${order.publicToken}`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PriceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    console.error("[orders]", error);
    return NextResponse.json({ error: "Impossible d'enregistrer la commande." }, { status: 500 });
  }
}
