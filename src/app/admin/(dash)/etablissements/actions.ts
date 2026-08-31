"use server";

import { revalidatePath } from "next/cache";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { sql, sqlOne } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export type ActionState = { ok?: string; error?: string };

export async function saveAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await getSuperAdminOrRedirect();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "restaurant_admin");
  const password = String(formData.get("password") ?? "");
  const restaurantId = role === "super_admin" ? null : Number(formData.get("restaurant_id")) || null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Adresse e-mail invalide." };
  if (!name) return { error: "Le nom est obligatoire." };
  if (role === "restaurant_admin" && !restaurantId) return { error: "Choisissez l'établissement rattaché." };

  const existing = await sqlOne<{ id: number }>(`SELECT id FROM admins WHERE lower(email) = $1`, [email]);

  if (existing) {
    await sql(`UPDATE admins SET name=$2, role=$3, restaurant_id=$4 WHERE id=$1`, [
      existing.id, name, role, restaurantId,
    ]);
    if (password) {
      if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
      await sql(`UPDATE admins SET password_hash=$2 WHERE id=$1`, [existing.id, await hashPassword(password)]);
      // Un changement de mot de passe met fin aux sessions ouvertes.
      await sql(`DELETE FROM admin_sessions WHERE admin_id = $1`, [existing.id]);
    }
    revalidatePath("/admin/etablissements");
    return { ok: `Compte ${email} mis à jour.` };
  }

  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  await sql(
    `INSERT INTO admins (email, name, password_hash, role, restaurant_id) VALUES ($1,$2,$3,$4,$5)`,
    [email, name, await hashPassword(password), role, restaurantId],
  );
  revalidatePath("/admin/etablissements");
  return { ok: `Compte ${email} créé.` };
}

export async function toggleAdmin(formData: FormData) {
  const me = await getSuperAdminOrRedirect();
  const id = Number(formData.get("adminId"));
  // On ne se désactive pas soi-même : cela fermerait la porte de l'intérieur.
  if (id === me.id) return;
  await sql(`UPDATE admins SET is_active = NOT is_active WHERE id = $1`, [id]);
  await sql(`DELETE FROM admin_sessions WHERE admin_id = $1`, [id]);
  revalidatePath("/admin/etablissements");
}
