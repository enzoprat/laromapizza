"use server";

import { revalidatePath } from "next/cache";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { sql } from "@/lib/db";

export type ActionState = { ok?: string; error?: string };

const euros = (value: FormDataEntryValue | null) => {
  const n = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};
const int = (value: FormDataEntryValue | null) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

export async function savePromotion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await getSuperAdminOrRedirect();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Donnez un nom à la promotion." };

  const kind = String(formData.get("kind") ?? "buy_x_get_y");
  const orderTypes = formData.getAll("order_types").map(String);
  if (!orderTypes.length) return { error: "Choisissez au moins un mode : à emporter ou livraison." };

  const restaurantIds = formData.getAll("restaurants").map(Number).filter(Boolean);
  if (!restaurantIds.length) return { error: "Choisissez au moins un établissement." };

  const categoryIds = formData.getAll("categories").map(Number).filter(Boolean);
  const sizeCodes = String(formData.get("size_codes") ?? "")
    .split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);

  // Une remise en pourcentage se saisit en points, pas en euros.
  const discountValue = kind === "percent" ? int(formData.get("discount_percent")) : euros(formData.get("discount_amount"));

  const values = [
    name,
    String(formData.get("description") ?? "").trim() || null,
    kind,
    int(formData.get("buy_quantity")),
    int(formData.get("free_quantity")),
    discountValue,
    orderTypes,
    categoryIds,
    sizeCodes,
    String(formData.get("service") ?? "all"),
    euros(formData.get("min_order")),
    String(formData.get("starts_on") ?? "") || null,
    String(formData.get("ends_on") ?? "") || null,
    formData.get("is_stackable") === "on",
    int(formData.get("priority")),
    formData.get("is_active") === "on",
  ];

  const id = Number(formData.get("promotionId")) || null;
  let promotionId = id;

  if (id) {
    await sql(
      `UPDATE promotions SET name=$2, description=$3, kind=$4, buy_quantity=$5, free_quantity=$6,
         discount_value=$7, order_types=$8, category_ids=$9, size_codes=$10, service=$11,
         min_order=$12, starts_on=$13, ends_on=$14, is_stackable=$15, priority=$16, is_active=$17
       WHERE id=$1`,
      [id, ...values],
    );
  } else {
    const code = String(formData.get("code") ?? "").trim().toUpperCase() ||
      `PROMO-${Math.abs(name.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 100000}`;
    const existing = await sql<{ id: number }>(`SELECT id FROM promotions WHERE code = $1`, [code]);
    if (existing.length) return { error: `Le code « ${code} » est déjà utilisé.` };

    const [row] = await sql<{ id: number }>(
      `INSERT INTO promotions (code, name, description, kind, buy_quantity, free_quantity,
         discount_value, order_types, category_ids, size_codes, service, min_order,
         starts_on, ends_on, is_stackable, priority, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [code, ...values],
    );
    promotionId = row.id;
  }

  await sql(`DELETE FROM promotion_restaurants WHERE promotion_id = $1`, [promotionId]);
  for (const rid of restaurantIds) {
    await sql(`INSERT INTO promotion_restaurants (promotion_id, restaurant_id) VALUES ($1,$2)`, [promotionId, rid]);
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
  return { ok: "Promotion enregistrée." };
}

export async function togglePromotion(formData: FormData) {
  await getSuperAdminOrRedirect();
  await sql(`UPDATE promotions SET is_active = NOT is_active WHERE id = $1`, [Number(formData.get("promotionId"))]);
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
}

export async function deletePromotion(formData: FormData) {
  await getSuperAdminOrRedirect();
  await sql(`DELETE FROM promotions WHERE id = $1`, [Number(formData.get("promotionId"))]);
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
}
