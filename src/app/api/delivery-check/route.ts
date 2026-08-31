import { NextResponse } from "next/server";
import { z } from "zod";
import { getRestaurantBySlug, getZones, listRestaurants } from "@/lib/repo/restaurants";
import { findMatchingZone } from "@/lib/domain/zones";

export const dynamic = "force-dynamic";

const schema = z.object({
  restaurant: z.string().min(1).max(60),
  city: z.string().trim().max(80),
  postalCode: z.string().trim().max(10),
});

/**
 * Vérifie qu'une adresse est desservie. Si elle ne l'est pas, on propose
 * l'établissement La Roma qui la couvre plutôt que de renvoyer une impasse.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const { restaurant: slug, city, postalCode } = parsed.data;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return NextResponse.json({ error: "Établissement introuvable." }, { status: 404 });

  const zones = await getZones(restaurant.id);
  const zone = findMatchingZone(zones, city, postalCode);

  if (zone) {
    return NextResponse.json({
      covered: true,
      zone: { id: zone.id, label: zone.label, note: zone.note },
      minOrder: {
        lunch: zone.min_order ?? restaurant.delivery_min_lunch,
        dinner: zone.min_order ?? restaurant.delivery_min_dinner,
      },
    });
  }

  // Un autre établissement couvre-t-il cette adresse ?
  const others = (await listRestaurants()).filter((r) => r.id !== restaurant.id && r.delivery_enabled);
  for (const other of others) {
    const match = findMatchingZone(await getZones(other.id), city, postalCode);
    if (match) {
      return NextResponse.json({
        covered: false,
        message: `Cette adresse n'est malheureusement pas desservie par ${restaurant.name}.`,
        suggestion: {
          slug: other.slug,
          name: other.name,
          city: other.city,
          zoneLabel: match.label,
        },
      });
    }
  }

  return NextResponse.json({
    covered: false,
    message: `Cette adresse n'est malheureusement pas desservie par ${restaurant.name}.`,
    suggestion: null,
  });
}
