export type DeliveryZone = {
  id: number;
  restaurant_id: number;
  label: string;
  city_match: string;
  postal_codes: string[];
  min_order: number | null;
  delivery_fee: number | null;
  note: string | null;
};

/** Même normalisation qu'au seed : minuscules, sans accents, sans "bas/haut". */
export function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(bas|haut)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const normalizePostalCode = (value: string) => value.replace(/\D/g, "").slice(0, 5);

/**
 * Une zone correspond si le code postal est listé, ou si la commune porte le
 * même nom. On accepte l'un ou l'autre : les clients saisissent rarement les
 * deux correctement, et le restaurant valide de toute façon à l'acceptation.
 */
export function findMatchingZone(
  zones: DeliveryZone[],
  city: string,
  postalCode: string,
): DeliveryZone | null {
  const c = normalizeCity(city);
  const cp = normalizePostalCode(postalCode);

  const exact = zones.find((z) => z.city_match === c && z.postal_codes.includes(cp));
  if (exact) return exact;

  const byPostal = zones.find((z) => cp.length === 5 && z.postal_codes.includes(cp));
  if (byPostal) return byPostal;

  return zones.find((z) => c.length > 1 && z.city_match === c) ?? null;
}
