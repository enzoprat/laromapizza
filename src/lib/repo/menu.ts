import "server-only";
import { sql } from "../db";
import type { Category, Extra, Menu, OptionGroup, Product, Variant } from "../types";
import { jsonObject } from "../db/json";

type ProductRow = {
  id: number; category_id: number; slug: string; name: string; description: string | null;
  image: string | null; is_new: boolean; is_popular: boolean; is_vegetarian: boolean;
  is_halal: boolean; kind: "simple" | "pizza" | "menu"; evening_surcharge: number;
  availability: "all" | "pickup" | "delivery"; allergens: string[];
  out_of_stock: boolean; position: number;
};

/**
 * Carte d'un établissement.
 *
 * Sept requêtes à plat, assemblage en mémoire : pas de N+1, et le résultat est
 * mis en cache par page (revalidate) puisqu'il change rarement.
 */
export async function getMenu(restaurantId: number): Promise<Menu> {
  const [categories, products, variants, groupLinks, options, extras, extraLinks] = await Promise.all([
    sql<{ id: number; slug: string; name: string; description: string | null; icon: string | null }>(
      `SELECT id, slug, name, description, icon FROM categories
       WHERE is_active = true ORDER BY position, id`,
    ),
    sql<ProductRow>(
      `SELECT p.id, p.category_id, p.slug, p.name, p.description, p.image, p.is_new,
              p.is_popular, p.is_vegetarian, p.is_halal, p.kind, p.evening_surcharge,
              p.availability, p.allergens, p.position,
              COALESCE(rp.out_of_stock, false) AS out_of_stock
       FROM products p
       LEFT JOIN restaurant_products rp
              ON rp.product_id = p.id AND rp.restaurant_id = $1
       WHERE p.is_active = true
         AND COALESCE(rp.is_available, true) = true
       ORDER BY p.position, p.id`,
      [restaurantId],
    ),
    sql<Variant & { product_id: number; position: number }>(
      `SELECT v.id, v.product_id, v.name, v.short_name, v.size_code, v.is_default, v.position,
              COALESCE(rvp.price, v.price) AS price
       FROM product_variants v
       LEFT JOIN restaurant_variant_prices rvp
              ON rvp.variant_id = v.id AND rvp.restaurant_id = $1
       WHERE v.is_active = true
       ORDER BY v.position, v.id`,
      [restaurantId],
    ),
    sql<{ product_id: number; group_id: number; is_required: boolean; position: number;
          slug: string; name: string; min_select: number; max_select: number }>(
      `SELECT pog.product_id, pog.group_id, pog.is_required, pog.position,
              g.slug, g.name, g.min_select, g.max_select
       FROM product_option_groups pog
       JOIN option_groups g ON g.id = pog.group_id
       ORDER BY pog.position, g.id`,
    ),
    sql<{ id: number; group_id: number; name: string; price_delta: number; is_default: boolean }>(
      `SELECT id, group_id, name, price_delta, is_default FROM product_options
       WHERE is_active = true ORDER BY position, id`,
    ),
    sql<Extra & { position: number }>(
      `SELECT id, slug, name, category, price_by_size, price_default, position
       FROM product_extras WHERE is_active = true ORDER BY position, id`,
    ),
    sql<{ category_id: number; extra_id: number }>(`SELECT category_id, extra_id FROM category_extras`),
  ]);

  const variantsByProduct = new Map<number, Variant[]>();
  for (const v of variants) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push({ id: v.id, name: v.name, short_name: v.short_name, price: Number(v.price), size_code: v.size_code, is_default: v.is_default });
    variantsByProduct.set(v.product_id, list);
  }

  const optionsByGroup = new Map<number, typeof options>();
  for (const o of options) {
    const list = optionsByGroup.get(o.group_id) ?? [];
    list.push(o);
    optionsByGroup.set(o.group_id, list);
  }

  const groupsByProduct = new Map<number, OptionGroup[]>();
  for (const g of groupLinks) {
    const list = groupsByProduct.get(g.product_id) ?? [];
    list.push({
      id: g.group_id, slug: g.slug, name: g.name,
      min_select: g.min_select, max_select: g.max_select, is_required: g.is_required,
      options: (optionsByGroup.get(g.group_id) ?? []).map((o) => ({
        id: o.id, name: o.name, price_delta: Number(o.price_delta), is_default: o.is_default,
      })),
    });
    groupsByProduct.set(g.product_id, list);
  }

  // price_by_size est du jsonb : selon le pilote il arrive en objet ou en
  // chaîne. Non normalisé, l'accès par taille renverrait undefined et le
  // supplément serait facturé au tarif par défaut, sans la moindre alerte.
  const extrasById = new Map(
    extras.map((e) => [e.id, { ...e, price_by_size: jsonObject<Record<string, number>>(e.price_by_size) }]),
  );
  const extrasByCategory = new Map<number, Extra[]>();
  for (const link of extraLinks) {
    const extra = extrasById.get(link.extra_id);
    if (!extra) continue;
    const list = extrasByCategory.get(link.category_id) ?? [];
    list.push(extra);
    extrasByCategory.set(link.category_id, list);
  }

  const productsByCategory = new Map<number, Product[]>();
  for (const p of products) {
    const variantList = variantsByProduct.get(p.id) ?? [];
    if (!variantList.length) continue; // un produit sans tarif n'est pas commandable
    const list = productsByCategory.get(p.category_id) ?? [];
    list.push({
      id: p.id, slug: p.slug, name: p.name, description: p.description, image: p.image,
      is_new: p.is_new, is_popular: p.is_popular, is_vegetarian: p.is_vegetarian,
      is_halal: p.is_halal, kind: p.kind, evening_surcharge: Number(p.evening_surcharge),
      availability: p.availability, allergens: p.allergens ?? [], out_of_stock: p.out_of_stock,
      variants: variantList,
      optionGroups: groupsByProduct.get(p.id) ?? [],
      extras: extrasByCategory.get(p.category_id) ?? [],
    });
    productsByCategory.set(p.category_id, list);
  }

  const result: Category[] = categories
    .map((c) => ({ ...c, products: productsByCategory.get(c.id) ?? [] }))
    .filter((c) => c.products.length > 0);

  return { categories: result };
}

/** Tous les slugs de produits — utile au sitemap et aux données structurées. */
export async function getCategorySlugs(): Promise<{ slug: string; name: string }[]> {
  return sql(`SELECT slug, name FROM categories WHERE is_active = true ORDER BY position`);
}
