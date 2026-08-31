import "server-only";
import { sql, sqlOne } from "../db";

/** Requêtes réservées à l'administration. */

export async function listClosures(restaurantId: number) {
  return sql<{ id: number; starts_on: string; ends_on: string; reason: string | null }>(
    `SELECT id, to_char(starts_on,'YYYY-MM-DD') AS starts_on,
            to_char(ends_on,'YYYY-MM-DD') AS ends_on, reason
     FROM restaurant_closures WHERE restaurant_id = $1
       AND ends_on >= (now() AT TIME ZONE 'Europe/Paris')::date - 30
     ORDER BY starts_on DESC`,
    [restaurantId],
  );
}

export type CatalogProduct = {
  id: number; slug: string; name: string; description: string | null;
  category_id: number; category_name: string; category_slug: string;
  is_active: boolean; is_new: boolean; is_popular: boolean;
  evening_surcharge: number; availability: string;
  variants: { id: number; name: string; price: number; size_code: string | null }[];
};

export async function listCatalog(): Promise<CatalogProduct[]> {
  return sql<CatalogProduct>(
    `SELECT p.id, p.slug, p.name, p.description, p.category_id,
            c.name AS category_name, c.slug AS category_slug,
            p.is_active, p.is_new, p.is_popular, p.evening_surcharge, p.availability,
            COALESCE(
              (SELECT json_agg(json_build_object('id', v.id, 'name', v.name, 'price', v.price, 'size_code', v.size_code)
                               ORDER BY v.position)
               FROM product_variants v WHERE v.product_id = p.id AND v.is_active = true),
              '[]'::json
            ) AS variants
     FROM products p JOIN categories c ON c.id = p.category_id
     ORDER BY c.position, p.position, p.id`,
  );
}

/** Disponibilité produit par produit pour un établissement. */
export async function listAvailability(restaurantId: number) {
  return sql<{
    id: number; name: string; category_name: string; category_slug: string;
    is_available: boolean; out_of_stock: boolean;
  }>(
    `SELECT p.id, p.name, c.name AS category_name, c.slug AS category_slug,
            COALESCE(rp.is_available, true) AS is_available,
            COALESCE(rp.out_of_stock, false) AS out_of_stock
     FROM products p
     JOIN categories c ON c.id = p.category_id
     LEFT JOIN restaurant_products rp ON rp.product_id = p.id AND rp.restaurant_id = $1
     WHERE p.is_active = true
     ORDER BY c.position, p.position, p.id`,
    [restaurantId],
  );
}

export async function setProductAvailability(
  restaurantId: number,
  productId: number,
  patch: { isAvailable?: boolean; outOfStock?: boolean },
) {
  const current = await sqlOne<{ is_available: boolean; out_of_stock: boolean }>(
    `SELECT is_available, out_of_stock FROM restaurant_products
     WHERE restaurant_id = $1 AND product_id = $2`,
    [restaurantId, productId],
  );
  const isAvailable = patch.isAvailable ?? current?.is_available ?? true;
  const outOfStock = patch.outOfStock ?? current?.out_of_stock ?? false;

  await sql(
    `INSERT INTO restaurant_products (restaurant_id, product_id, is_available, out_of_stock, updated_at)
     VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (restaurant_id, product_id)
     DO UPDATE SET is_available = EXCLUDED.is_available,
                   out_of_stock = EXCLUDED.out_of_stock,
                   updated_at = now()`,
    [restaurantId, productId, isAvailable, outOfStock],
  );
  return { isAvailable, outOfStock };
}

export type AdminPromotion = {
  id: number; code: string; name: string; description: string | null; kind: string;
  buy_quantity: number; free_quantity: number; discount_value: number;
  order_types: string[]; size_codes: string[]; category_ids: number[];
  service: string; min_order: number; starts_on: string | null; ends_on: string | null;
  is_active: boolean; is_stackable: boolean; priority: number;
  restaurant_ids: number[];
};

export async function listPromotions(): Promise<AdminPromotion[]> {
  return sql<AdminPromotion>(
    `SELECT p.id, p.code, p.name, p.description, p.kind, p.buy_quantity, p.free_quantity,
            p.discount_value, p.order_types, p.size_codes, p.category_ids, p.service,
            p.min_order, to_char(p.starts_on,'YYYY-MM-DD') AS starts_on,
            to_char(p.ends_on,'YYYY-MM-DD') AS ends_on, p.is_active, p.is_stackable, p.priority,
            COALESCE(
              (SELECT array_agg(pr.restaurant_id) FROM promotion_restaurants pr WHERE pr.promotion_id = p.id),
              '{}'
            ) AS restaurant_ids
     FROM promotions p ORDER BY p.is_active DESC, p.priority DESC, p.id`,
  );
}

export async function listCategories() {
  return sql<{ id: number; slug: string; name: string; position: number; is_active: boolean }>(
    `SELECT id, slug, name, position, is_active FROM categories ORDER BY position, id`,
  );
}
