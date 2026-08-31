import { notFound } from "next/navigation";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { listRestaurants } from "@/lib/repo/restaurants";
import { listCategories } from "@/lib/repo/admin";
import { sql, sqlOne } from "@/lib/db";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await getSuperAdminOrRedirect();
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const product = await sqlOne<{
    id: number; name: string; description: string | null; image: string | null;
    category_id: number; is_new: boolean; is_popular: boolean; is_vegetarian: boolean;
    is_active: boolean; kind: string; evening_surcharge: number; availability: string;
    allergens: string[];
  }>(
    `SELECT id, name, description, image, category_id, is_new, is_popular, is_vegetarian,
            is_active, kind, evening_surcharge, availability, allergens
     FROM products WHERE id = $1`,
    [productId],
  );
  if (!product) notFound();

  const [variants, categories, restaurants, links, prices] = await Promise.all([
    sql<{ id: number; name: string; price: number; size_code: string | null }>(
      `SELECT id, name, price, size_code FROM product_variants
       WHERE product_id = $1 AND is_active = true ORDER BY position, id`, [productId]),
    listCategories(),
    listRestaurants(),
    sql<{ restaurant_id: number; is_available: boolean }>(
      `SELECT restaurant_id, is_available FROM restaurant_products WHERE product_id = $1`, [productId]),
    sql<{ restaurant_id: number; variant_id: number; price: number }>(
      `SELECT rvp.restaurant_id, rvp.variant_id, rvp.price
       FROM restaurant_variant_prices rvp
       JOIN product_variants v ON v.id = rvp.variant_id
       WHERE v.product_id = $1`, [productId]),
  ]);

  const availability: Record<number, boolean> = {};
  for (const link of links) availability[link.restaurant_id] = link.is_available;

  const localPrices: Record<string, number> = {};
  for (const p of prices) localPrices[`${p.restaurant_id}_${p.variant_id}`] = Number(p.price);

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">{product.name}</h1>
      <p className="mt-0.5 text-sm text-ink-soft">Modifier ce produit sur l&apos;ensemble des établissements.</p>
      <div className="mt-5">
        <ProductForm
          product={{ ...product, allergens: product.allergens ?? [], evening_surcharge: Number(product.evening_surcharge) }}
          categories={categories}
          restaurants={restaurants.map((r) => ({ id: r.id, name: r.name, city: r.city }))}
          variants={variants.map((v) => ({ ...v, price: Number(v.price) }))}
          availability={availability}
          localPrices={localPrices}
        />
      </div>
    </main>
  );
}
