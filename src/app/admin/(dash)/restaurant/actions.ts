"use server";

import { revalidatePath } from "next/cache";
import { getAdminOrRedirect } from "@/lib/auth/guard";
import { canAccessRestaurant } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { normalizeCity } from "@/lib/domain/zones";

export type ActionState = { ok?: string; error?: string };

/** Un responsable ne peut agir que sur son établissement — vérifié à chaque action. */
async function assertScope(restaurantId: number) {
  const admin = await getAdminOrRedirect();
  if (!canAccessRestaurant(admin, restaurantId)) throw new Error("Accès refusé.");
  return admin;
}

const euros = (value: FormDataEntryValue | null) => {
  const n = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};
const int = (value: FormDataEntryValue | null, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const restaurantId = Number(formData.get("restaurantId"));
  const admin = await assertScope(restaurantId);

  await sql(
    `UPDATE restaurants SET
       phone = $2, mobile = $3, street = $4, postal_code = $5, city = $6, photo = $7,
       prep_time_min = $8, delivery_time_min = $9, slot_interval_min = $10, slot_capacity = $11,
       delivery_min_lunch = $12, delivery_min_dinner = $13, delivery_fee = $14,
       pickup_enabled = $15, delivery_enabled = $16, accepting_orders = $17
     WHERE id = $1`,
    [
      restaurantId,
      String(formData.get("phone") ?? "").trim(),
      String(formData.get("mobile") ?? "").trim() || null,
      String(formData.get("street") ?? "").trim(),
      String(formData.get("postal_code") ?? "").trim(),
      String(formData.get("city") ?? "").trim(),
      String(formData.get("photo") ?? "").trim() || null,
      int(formData.get("prep_time_min"), 20),
      int(formData.get("delivery_time_min"), 40),
      Math.max(5, int(formData.get("slot_interval_min"), 15)),
      Math.max(1, int(formData.get("slot_capacity"), 8)),
      euros(formData.get("delivery_min_lunch")),
      euros(formData.get("delivery_min_dinner")),
      euros(formData.get("delivery_fee")),
      formData.get("pickup_enabled") === "on",
      formData.get("delivery_enabled") === "on",
      formData.get("accepting_orders") === "on",
    ],
  );

  // Le paiement en ligne s'active établissement par établissement, et
  // uniquement par la direction.
  if (admin.role === "super_admin") {
    await sql(
      `UPDATE restaurants SET online_payment_enabled = $2, name = $3,
              seo_title = $4, seo_description = $5, seo_intro = $6
       WHERE id = $1`,
      [
        restaurantId,
        formData.get("online_payment_enabled") === "on",
        String(formData.get("name") ?? "").trim(),
        String(formData.get("seo_title") ?? "").trim() || null,
        String(formData.get("seo_description") ?? "").trim() || null,
        String(formData.get("seo_intro") ?? "").trim() || null,
      ],
    );
  }

  revalidatePath("/admin/restaurant");
  revalidatePath("/", "layout");
  return { ok: "Paramètres enregistrés." };
}

export async function saveHours(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const restaurantId = Number(formData.get("restaurantId"));
  await assertScope(restaurantId);

  await sql(`DELETE FROM restaurant_hours WHERE restaurant_id = $1`, [restaurantId]);

  for (let weekday = 0; weekday < 7; weekday++) {
    for (const service of ["midi", "soir"] as const) {
      const opens = String(formData.get(`${service}_open_${weekday}`) ?? "").trim();
      const closes = String(formData.get(`${service}_close_${weekday}`) ?? "").trim();
      // Une plage vide signifie « fermé » : on ne l'enregistre pas.
      if (!/^\d{2}:\d{2}$/.test(opens) || !/^\d{2}:\d{2}$/.test(closes)) continue;
      if (opens >= closes) continue;
      await sql(
        `INSERT INTO restaurant_hours (restaurant_id, weekday, opens_at, closes_at, service)
         VALUES ($1,$2,$3,$4,$5)`,
        [restaurantId, weekday, opens, closes, service],
      );
    }
  }

  revalidatePath("/admin/restaurant");
  revalidatePath("/", "layout");
  return { ok: "Horaires enregistrés." };
}

export async function addClosure(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const restaurantId = Number(formData.get("restaurantId"));
  await assertScope(restaurantId);

  const from = String(formData.get("starts_on") ?? "");
  const to = String(formData.get("ends_on") ?? "") || from;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return { error: "Date de début invalide." };
  if (to < from) return { error: "La date de fin précède la date de début." };

  await sql(
    `INSERT INTO restaurant_closures (restaurant_id, starts_on, ends_on, reason) VALUES ($1,$2,$3,$4)`,
    [restaurantId, from, to, String(formData.get("reason") ?? "").trim() || null],
  );
  revalidatePath("/admin/restaurant");
  revalidatePath("/", "layout");
  return { ok: "Fermeture enregistrée." };
}

export async function removeClosure(formData: FormData) {
  const restaurantId = Number(formData.get("restaurantId"));
  await assertScope(restaurantId);
  await sql(`DELETE FROM restaurant_closures WHERE id = $1 AND restaurant_id = $2`, [
    Number(formData.get("closureId")), restaurantId,
  ]);
  revalidatePath("/admin/restaurant");
  revalidatePath("/", "layout");
}

export async function saveZone(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const restaurantId = Number(formData.get("restaurantId"));
  await assertScope(restaurantId);

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Le nom de la zone est obligatoire." };

  const codes = String(formData.get("postal_codes") ?? "")
    .split(/[,\s]+/).map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 5);

  const minOrder = String(formData.get("min_order") ?? "").trim();
  const zoneId = Number(formData.get("zoneId"));

  if (zoneId) {
    await sql(
      `UPDATE delivery_zones SET label = $3, city_match = $4, postal_codes = $5,
              min_order = $6, note = $7
       WHERE id = $1 AND restaurant_id = $2`,
      [zoneId, restaurantId, label, normalizeCity(label), codes,
       minOrder ? Math.round(Number(minOrder.replace(",", ".")) * 100) : null,
       String(formData.get("note") ?? "").trim() || null],
    );
    revalidatePath("/admin/restaurant");
    return { ok: "Zone mise à jour." };
  }

  await sql(
    `INSERT INTO delivery_zones (restaurant_id, label, city_match, postal_codes, min_order, note)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [restaurantId, label, normalizeCity(label), codes,
     minOrder ? Math.round(Number(minOrder.replace(",", ".")) * 100) : null,
     String(formData.get("note") ?? "").trim() || null],
  );
  revalidatePath("/admin/restaurant");
  revalidatePath("/", "layout");
  return { ok: "Zone ajoutée." };
}

export async function removeZone(formData: FormData) {
  const restaurantId = Number(formData.get("restaurantId"));
  await assertScope(restaurantId);
  await sql(`DELETE FROM delivery_zones WHERE id = $1 AND restaurant_id = $2`, [
    Number(formData.get("zoneId")), restaurantId,
  ]);
  revalidatePath("/admin/restaurant");
  revalidatePath("/", "layout");
}
