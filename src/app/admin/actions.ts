"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { headers } from "next/headers";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  // Les espaces et retours à la ligne accrochés lors d'un copier-coller sont
  // retirés : personne ne choisit volontairement un mot de passe bordé
  // d'espaces, et c'est une cause d'échec de connexion aussi fréquente
  // qu'invisible pour l'utilisateur.
  const password = String(formData.get("password") ?? "").trim();
  if (!email || !password) return { error: "Renseignez votre e-mail et votre mot de passe." };

  // Freine les tentatives répétées sans bloquer un responsable qui se trompe.
  const ip = clientIp(await headers());
  const allowed = await rateLimit(`login:${ip}`, 12, 600);
  if (!allowed) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };

  const admin = await login(email, password);
  if (!admin) return { error: "E-mail ou mot de passe incorrect." };

  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}
