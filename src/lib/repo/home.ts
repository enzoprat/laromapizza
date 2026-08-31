import "server-only";
import { sql } from "../db";

/**
 * Contenu de la page d'accueil.
 *
 * Tout vient de la base : les pizzas mises en avant, les catégories, les
 * promotions actives et les communes livrées. Si la carte change dans
 * l'administration, la page d'accueil suit — aucun texte figé à maintenir.
 */

export type HighlightProduct = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  is_new: boolean;
  min_price: number;
  max_price: number;
};

/** Pizzas mises en avant : les « populaires », complétées par les nouveautés. */
export async function getHighlights(limit = 6): Promise<HighlightProduct[]> {
  return sql<HighlightProduct>(
    `SELECT p.id, p.slug, p.name, p.description, p.image, p.is_new,
            min(v.price) AS min_price, max(v.price) AS max_price
     FROM products p
     JOIN product_variants v ON v.product_id = p.id AND v.is_active = true
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = true AND c.slug LIKE 'pizzas-%'
       AND p.image IS NOT NULL          -- une vedette sans photo laisse un trou
       AND (p.is_popular = true OR p.is_new = true)
     GROUP BY p.id
     ORDER BY p.is_popular DESC, p.is_new DESC, min(v.price)
     LIMIT $1`,
    [limit],
  );
}

export type CategorySummary = {
  slug: string;
  name: string;
  description: string | null;
  product_count: number;
  min_price: number;
};

export async function getCategorySummaries(): Promise<CategorySummary[]> {
  return sql<CategorySummary>(
    `SELECT c.slug, c.name, c.description,
            count(DISTINCT p.id)::int AS product_count,
            min(v.price) AS min_price
     FROM categories c
     JOIN products p ON p.category_id = c.id AND p.is_active = true
     JOIN product_variants v ON v.product_id = p.id AND v.is_active = true
     WHERE c.is_active = true
     GROUP BY c.id
     HAVING count(DISTINCT p.id) > 0
     ORDER BY c.position`,
  );
}

export type PublicPromotion = { id: number; name: string; description: string | null; order_types: string[] };

/** Offres en cours, tous établissements confondus. */
export async function getActivePromotions(): Promise<PublicPromotion[]> {
  return sql<PublicPromotion>(
    `SELECT DISTINCT p.id, p.name, p.description, p.order_types, p.priority
     FROM promotions p
     JOIN promotion_restaurants pr ON pr.promotion_id = p.id
     WHERE p.is_active = true
       AND (p.starts_on IS NULL OR p.starts_on <= (now() AT TIME ZONE 'Europe/Paris')::date)
       AND (p.ends_on   IS NULL OR p.ends_on   >= (now() AT TIME ZONE 'Europe/Paris')::date)
     ORDER BY p.priority DESC, p.id`,
  );
}

export type ServedArea = {
  label: string;
  postal_codes: string[];
  note: string | null;
  restaurant_slug: string;
  restaurant_city: string;
};

/** Communes desservies, avec l'établissement qui les livre. */
export async function getServedAreas(): Promise<ServedArea[]> {
  return sql<ServedArea>(
    `SELECT z.label, z.postal_codes, z.note, r.slug AS restaurant_slug, r.city AS restaurant_city
     FROM delivery_zones z
     JOIN restaurants r ON r.id = z.restaurant_id
     WHERE z.is_active = true AND r.is_active = true AND r.delivery_enabled = true
     ORDER BY z.label`,
  );
}
