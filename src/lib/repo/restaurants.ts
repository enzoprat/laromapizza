import "server-only";
import { sql, sqlOne } from "../db";
import type { Restaurant } from "../types";
import type { Closure, OpeningHour } from "../domain/opening";
import { getOpeningStatus, type OpeningStatus } from "../domain/opening";
import type { DeliveryZone } from "../domain/zones";

const COLUMNS = `id, slug, name, city, street, postal_code, phone, mobile, photo,
  neighbourhood, prep_time_min, delivery_time_min, slot_interval_min, slot_capacity,
  delivery_min_lunch, delivery_min_dinner, delivery_fee, pickup_enabled, delivery_enabled,
  online_payment_enabled, accepting_orders, is_active, seo_title, seo_description,
  seo_intro, rating, rating_count, position`;

export async function listRestaurants(): Promise<Restaurant[]> {
  return sql<Restaurant>(
    `SELECT ${COLUMNS} FROM restaurants WHERE is_active = true ORDER BY position, name`,
  );
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  return sqlOne<Restaurant>(`SELECT ${COLUMNS} FROM restaurants WHERE slug = $1`, [slug]);
}

export async function getRestaurantById(id: number): Promise<Restaurant | null> {
  return sqlOne<Restaurant>(`SELECT ${COLUMNS} FROM restaurants WHERE id = $1`, [id]);
}

export async function getHours(restaurantId: number): Promise<OpeningHour[]> {
  return sql<OpeningHour>(
    `SELECT weekday, opens_at, closes_at, service FROM restaurant_hours
     WHERE restaurant_id = $1 ORDER BY weekday, opens_at`,
    [restaurantId],
  );
}

export async function getClosures(restaurantId: number): Promise<Closure[]> {
  return sql<Closure>(
    `SELECT to_char(starts_on,'YYYY-MM-DD') AS starts_on,
            to_char(ends_on,'YYYY-MM-DD')   AS ends_on,
            reason
     FROM restaurant_closures
     WHERE restaurant_id = $1 AND ends_on >= (now() AT TIME ZONE 'Europe/Paris')::date - 1
     ORDER BY starts_on`,
    [restaurantId],
  );
}

export async function getZones(restaurantId: number): Promise<DeliveryZone[]> {
  return sql<DeliveryZone>(
    `SELECT id, restaurant_id, label, city_match, postal_codes, min_order, delivery_fee, note
     FROM delivery_zones WHERE restaurant_id = $1 AND is_active = true ORDER BY label`,
    [restaurantId],
  );
}

export type RestaurantCard = Restaurant & {
  status: OpeningStatus;
  hours: OpeningHour[];
  zones: DeliveryZone[];
};

/** Les 4 établissements avec leur statut d'ouverture — écran d'accueil. */
export async function listRestaurantCards(now = new Date()): Promise<RestaurantCard[]> {
  const restaurants = await listRestaurants();
  if (!restaurants.length) return [];
  const ids = restaurants.map((r) => r.id);

  const [hours, closures, zones] = await Promise.all([
    sql<OpeningHour & { restaurant_id: number }>(
      `SELECT restaurant_id, weekday, opens_at, closes_at, service FROM restaurant_hours
       WHERE restaurant_id = ANY($1) ORDER BY weekday, opens_at`, [ids],
    ),
    sql<Closure & { restaurant_id: number }>(
      `SELECT restaurant_id,
              to_char(starts_on,'YYYY-MM-DD') AS starts_on,
              to_char(ends_on,'YYYY-MM-DD')   AS ends_on, reason
       FROM restaurant_closures
       WHERE restaurant_id = ANY($1)
         AND ends_on >= (now() AT TIME ZONE 'Europe/Paris')::date - 1`, [ids],
    ),
    sql<DeliveryZone>(
      `SELECT id, restaurant_id, label, city_match, postal_codes, min_order, delivery_fee, note
       FROM delivery_zones WHERE restaurant_id = ANY($1) AND is_active = true ORDER BY label`, [ids],
    ),
  ]);

  return restaurants.map((r) => {
    const h = hours.filter((x) => x.restaurant_id === r.id);
    const c = closures.filter((x) => x.restaurant_id === r.id);
    return { ...r, hours: h, zones: zones.filter((z) => z.restaurant_id === r.id), status: getOpeningStatus(h, c, now) };
  });
}

/** Statut d'ouverture d'un seul établissement. */
export async function getStatusFor(restaurantId: number, now = new Date()) {
  const [hours, closures] = await Promise.all([getHours(restaurantId), getClosures(restaurantId)]);
  return { hours, closures, status: getOpeningStatus(hours, closures, now) };
}
