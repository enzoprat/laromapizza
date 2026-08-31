"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { sql, sqlOne } from "@/lib/db";

export type ActionState = { ok?: string; error?: string };

const euros = (value: FormDataEntryValue | null) => {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};

const slugify = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Rend un slug unique en le suffixant si besoin. */
async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let candidate = base || "produit";
  for (let i = 0; i < 50; i++) {
    const existing = await sqlOne<{ id: number }>(`SELECT id FROM products WHERE slug = $1`, [candidate]);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now()}`;
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await getSuperAdminOrRedirect();

  const id = Number(formData.get("productId")) || null;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom du produit est obligatoire." };

  const categoryId = Number(formData.get("category_id"));
  if (!categoryId) return { error: "Choisissez une catégorie." };

  const payload = [
    categoryId,
    name,
    String(formData.get("description") ?? "").trim() || null,
    String(formData.get("image") ?? "").trim() || null,
    formData.get("is_new") === "on",
    formData.get("is_popular") === "on",
    formData.get("is_vegetarian") === "on",
    String(formData.get("kind") ?? "simple"),
    euros(formData.get("evening_surcharge")),
    String(formData.get("availability") ?? "all"),
    formData.get("is_active") === "on",
    String(formData.get("allergens") ?? "").split(",").map((a) => a.trim()).filter(Boolean),
  ];

  let productId = id;
  if (id) {
    await sql(
      `UPDATE products SET category_id=$2, name=$3, description=$4, image=$5, is_new=$6,
         is_popular=$7, is_vegetarian=$8, kind=$9, evening_surcharge=$10, availability=$11,
         is_active=$12, allergens=$13
       WHERE id=$1`,
      [id, ...payload],
    );
  } else {
    const slug = await uniqueSlug(slugify(name));
    const [row] = await sql<{ id: number }>(
      `INSERT INTO products (slug, category_id, name, description, image, is_new, is_popular,
                             is_vegetarian, kind, evening_surcharge, availability, is_active, allergens,
                             position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
               COALESCE((SELECT max(position)+1 FROM products WHERE category_id=$2), 0))
       RETURNING id`,
      [slug, ...payload],
    );
    productId = row.id;
  }

  // Variantes : les lignes existantes sont mises à jour, les vides ignorées.
  const variantIds = formData.getAll("variant_id");
  for (const [index, rawId] of variantIds.entries()) {
    const variantName = String(formData.get(`variant_name_${index}`) ?? "").trim();
    const price = euros(formData.get(`variant_price_${index}`));
    const sizeCode = String(formData.get(`variant_size_${index}`) ?? "").trim() || null;
    const remove = formData.get(`variant_delete_${index}`) === "on";
    const variantId = Number(rawId) || null;

    if (variantId && remove) {
      await sql(`UPDATE product_variants SET is_active = false WHERE id = $1`, [variantId]);
      continue;
    }
    if (!variantName) continue;

    if (variantId) {
      await sql(
        `UPDATE product_variants SET name=$2, price=$3, size_code=$4, position=$5 WHERE id=$1`,
        [variantId, variantName, price, sizeCode, index],
      );
    } else {
      await sql(
        `INSERT INTO product_variants (product_id, name, short_name, price, size_code, position, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [productId, variantName, sizeCode, price, sizeCode, index, index === 0],
      );
    }
  }

  // Disponibilité et tarifs par établissement. On repart des variantes telles
  // qu'elles existent en base : les variantes créées à l'instant sont incluses.
  const savedVariants = await sql<{ id: number }>(
    `SELECT id FROM product_variants WHERE product_id = $1 AND is_active = true ORDER BY position`,
    [productId],
  );

  for (const rid of formData.getAll("restaurant_id").map(Number)) {
    await sql(
      `INSERT INTO restaurant_products (restaurant_id, product_id, is_available, updated_at)
       VALUES ($1,$2,$3, now())
       ON CONFLICT (restaurant_id, product_id)
       DO UPDATE SET is_available = EXCLUDED.is_available, updated_at = now()`,
      [rid, productId, formData.get(`available_${rid}`) === "on"],
    );

    for (const variant of savedVariants) {
      const raw = String(formData.get(`price_${rid}_${variant.id}`) ?? "").trim();
      if (!raw) {
        // Champ vide = pas de tarif local, on retombe sur le prix de référence.
        await sql(`DELETE FROM restaurant_variant_prices WHERE restaurant_id=$1 AND variant_id=$2`, [rid, variant.id]);
      } else {
        await sql(
          `INSERT INTO restaurant_variant_prices (restaurant_id, variant_id, price)
           VALUES ($1,$2,$3)
           ON CONFLICT (restaurant_id, variant_id) DO UPDATE SET price = EXCLUDED.price`,
          [rid, variant.id, euros(raw)],
        );
      }
    }
  }

  revalidatePath("/admin/carte");
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/carte/${productId}`);
  return { ok: "Produit enregistré." };
}

export async function toggleProductActive(formData: FormData) {
  await getSuperAdminOrRedirect();
  await sql(`UPDATE products SET is_active = NOT is_active WHERE id = $1`, [Number(formData.get("productId"))]);
  revalidatePath("/admin/carte");
  revalidatePath("/", "layout");
}

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await getSuperAdminOrRedirect();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom de la catégorie est obligatoire." };

  const id = Number(formData.get("categoryId")) || null;
  if (id) {
    await sql(`UPDATE categories SET name=$2, description=$3, position=$4, is_active=$5 WHERE id=$1`, [
      id, name, String(formData.get("description") ?? "").trim() || null,
      Number(formData.get("position")) || 0, formData.get("is_active") === "on",
    ]);
  } else {
    await sql(
      `INSERT INTO categories (slug, name, description, position)
       VALUES ($1,$2,$3, COALESCE((SELECT max(position)+1 FROM categories), 0))`,
      [slugify(name), name, String(formData.get("description") ?? "").trim() || null],
    );
  }
  revalidatePath("/admin/carte");
  revalidatePath("/", "layout");
  return { ok: "Catégorie enregistrée." };
}

export async function saveExtra(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await getSuperAdminOrRedirect();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom du supplément est obligatoire." };

  const priceBySize = JSON.stringify({
    "31": euros(formData.get("price_31")),
    "40": euros(formData.get("price_40")),
  });
  const id = Number(formData.get("extraId")) || null;

  if (id) {
    await sql(
      `UPDATE product_extras SET name=$2, category=$3, price_by_size=$4::jsonb, price_default=$5, is_active=$6 WHERE id=$1`,
      [id, name, String(formData.get("category") ?? "ingredient"), priceBySize,
       euros(formData.get("price_31")), formData.get("is_active") === "on"],
    );
    revalidatePath("/admin/carte");
    revalidatePath("/", "layout");
    return { ok: "Supplément mis à jour." };
  }

  const [row] = await sql<{ id: number }>(
    `INSERT INTO product_extras (slug, name, category, price_by_size, price_default, position)
     VALUES ($1,$2,$3,$4::jsonb,$5, COALESCE((SELECT max(position)+1 FROM product_extras), 0))
     RETURNING id`,
    [slugify(name), name, String(formData.get("category") ?? "ingredient"), priceBySize, euros(formData.get("price_31"))],
  );
  // Un nouveau supplément est proposé sur toutes les catégories de pizzas.
  await sql(
    `INSERT INTO category_extras (category_id, extra_id)
     SELECT id, $1 FROM categories WHERE slug LIKE 'pizzas-%'
     ON CONFLICT DO NOTHING`,
    [row.id],
  );
  revalidatePath("/admin/carte");
  revalidatePath("/", "layout");
  return { ok: "Supplément ajouté." };
}
