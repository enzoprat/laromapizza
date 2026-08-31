import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { sql, sqlOne } from "../db";
import { verifyPassword } from "./password";

/**
 * Sessions administrateur.
 *
 * Choix : sessions en base + cookie httpOnly signé, plutôt que Supabase Auth.
 * Deux raisons concrètes. D'abord le comportement est strictement identique en
 * local et en production, sans dépendre d'un service externe. Ensuite tous les
 * accès à la base passent déjà par le serveur : on n'a pas besoin de RLS ni de
 * JWT côté navigateur pour un système à deux rôles. Basculer sur Supabase Auth
 * plus tard ne toucherait que ce fichier.
 */

const COOKIE = "roma_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // une journée de service

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: "super_admin" | "restaurant_admin";
  restaurant_id: number | null;
  restaurant_name?: string | null;
  restaurant_slug?: string | null;
};

export async function login(email: string, password: string): Promise<AdminUser | null> {
  const admin = await sqlOne<AdminUser & { password_hash: string; is_active: boolean }>(
    `SELECT a.id, a.email, a.name, a.password_hash, a.role, a.restaurant_id, a.is_active,
            r.name AS restaurant_name, r.slug AS restaurant_slug
     FROM admins a LEFT JOIN restaurants r ON r.id = a.restaurant_id
     WHERE lower(a.email) = lower($1)`,
    [email.trim()],
  );
  // On vérifie le mot de passe même si le compte n'existe pas : le temps de
  // réponse ne révèle donc pas l'existence d'un compte.
  const hash = admin?.password_hash ?? "scrypt$00$00";
  const ok = await verifyPassword(password, hash);
  if (!admin || !admin.is_active || !ok) return null;

  const id = randomUUID();
  const expires = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  await sql(`INSERT INTO admin_sessions (id, admin_id, expires_at) VALUES ($1,$2,$3)`, [id, admin.id, expires.toISOString()]);
  await sql(`UPDATE admins SET last_login_at = now() WHERE id = $1`, [admin.id]);
  await sql(`DELETE FROM admin_sessions WHERE expires_at < now()`);

  const store = await cookies();
  store.set(COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  const { password_hash: _hash, is_active: _active, ...user } = admin;
  return user;
}

export async function logout() {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (id) await sql(`DELETE FROM admin_sessions WHERE id = $1`, [id]);
  store.delete(COOKIE);
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (!id) return null;
  return sqlOne<AdminUser>(
    `SELECT a.id, a.email, a.name, a.role, a.restaurant_id,
            r.name AS restaurant_name, r.slug AS restaurant_slug
     FROM admin_sessions s
     JOIN admins a ON a.id = s.admin_id AND a.is_active = true
     LEFT JOIN restaurants r ON r.id = a.restaurant_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [id],
  );
}

/** Établissement sur lequel l'admin a le droit d'agir. Null = tous (super admin). */
export function scopeRestaurantId(admin: AdminUser): number | null {
  return admin.role === "super_admin" ? null : admin.restaurant_id;
}

export function canAccessRestaurant(admin: AdminUser, restaurantId: number): boolean {
  return admin.role === "super_admin" || admin.restaurant_id === restaurantId;
}
