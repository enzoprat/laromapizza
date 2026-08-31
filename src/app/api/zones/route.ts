import { NextResponse } from "next/server";
import { listRestaurants, getZones } from "@/lib/repo/restaurants";
import { findMatchingZone, normalizePostalCode } from "@/lib/domain/zones";
import { getOpeningStatus } from "@/lib/domain/opening";
import { getHours, getClosures } from "@/lib/repo/restaurants";

export const dynamic = "force-dynamic";

/**
 * « Vous livrez chez moi ? » — la première question d'un client affamé.
 * On répond sur tout le réseau d'un coup, avec le statut d'ouverture, pour
 * qu'il sache immédiatement s'il peut commander maintenant.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const code = normalizePostalCode(query);
  const city = /\d/.test(query) ? "" : query.trim();

  if (code.length < 5 && city.length < 3) {
    return NextResponse.json({ status: "incomplet" });
  }

  const restaurants = (await listRestaurants()).filter((r) => r.delivery_enabled);
  const matches: {
    slug: string; name: string; city: string; label: string; zone: string;
    note: string | null; isOpen: boolean; nextOpening: string | null;
  }[] = [];

  for (const r of restaurants) {
    const zone = findMatchingZone(await getZones(r.id), city, code);
    if (!zone) continue;
    const [hours, closures] = await Promise.all([getHours(r.id), getClosures(r.id)]);
    const status = getOpeningStatus(hours, closures);
    matches.push({
      slug: r.slug, name: r.name, city: r.city,
      // « Bordeaux » seul serait ambigu : deux établissements portent cette ville.
      label: r.slug === "bordeaux-bastide" ? "Bordeaux Bastide" : r.city,
      zone: zone.label, note: zone.note,
      isOpen: status.isOpen,
      nextOpening: status.nextOpening?.label ?? null,
    });
  }

  return NextResponse.json({
    status: matches.length ? "desservi" : "hors-zone",
    // L'établissement ouvert passe devant : c'est celui où l'on peut commander.
    matches: matches.sort((a, b) => Number(b.isOpen) - Number(a.isOpen)),
  });
}
