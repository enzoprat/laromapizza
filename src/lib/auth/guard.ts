import "server-only";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentAdmin, type AdminUser } from "./session";

/** Garde des routes d'API admin : renvoie l'admin ou une réponse 401/403. */
export async function requireAdmin(): Promise<
  { admin: AdminUser } | { response: NextResponse }
> {
  const admin = await getCurrentAdmin();
  if (!admin) return { response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  return { admin };
}

export async function requireSuperAdmin(): Promise<
  { admin: AdminUser } | { response: NextResponse }
> {
  const result = await requireAdmin();
  if ("response" in result) return result;
  if (result.admin.role !== "super_admin") {
    return { response: NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 }) };
  }
  return result;
}

/**
 * Établissement sur lequel porte la requête.
 * Un responsable d'établissement est toujours ramené au sien, quoi qu'il
 * demande : le périmètre ne dépend jamais d'un paramètre d'URL.
 */
export function resolveScope(admin: AdminUser, requested?: string | null): number | null {
  if (admin.role === "restaurant_admin") return admin.restaurant_id;
  if (!requested || requested === "all") return null;
  const id = Number(requested);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Garde des pages admin.
 * Next rend la mise en page et la page en parallèle : la redirection du layout
 * n'empêche donc pas la page de s'exécuter. Chaque page refait la vérification.
 */
export async function getAdminOrRedirect(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function getSuperAdminOrRedirect(): Promise<AdminUser> {
  const admin = await getAdminOrRedirect();
  if (admin.role !== "super_admin") redirect("/admin");
  return admin;
}
