"use client";

import { useActionState, useState } from "react";
import { Field, Section, StatusMessage, SubmitButton } from "@/components/admin/ui";
import { saveAdmin, toggleAdmin, type ActionState } from "./actions";
import { cn } from "@/lib/utils";

type Admin = {
  id: number; email: string; name: string; role: string;
  restaurant_id: number | null; is_active: boolean; last_login_at: string | null;
};

export function AdminAccounts({
  admins,
  restaurants,
}: {
  admins: Admin[];
  restaurants: { id: number; name: string; city: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveAdmin, {});
  const [role, setRole] = useState("restaurant_admin");

  return (
    <Section
      title="Accès"
      description="Un responsable ne voit que son établissement. Le Super Admin voit les quatre."
    >
      <ul className="divide-y divide-line">
        {admins.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">{a.name}</span>
              <span className="block text-[13px] text-ink-soft">{a.email}</span>
              <span className="block text-xs text-ink-muted">
                {a.role === "super_admin"
                  ? "Super Admin — tous les établissements"
                  : restaurants.find((r) => r.id === a.restaurant_id)?.name ?? "Établissement supprimé"}
                {a.last_login_at
                  ? ` · dernière connexion le ${new Date(a.last_login_at).toLocaleDateString("fr-FR")}`
                  : " · jamais connecté"}
              </span>
            </span>
            <form action={toggleAdmin}>
              <input type="hidden" name="adminId" value={a.id} />
              <button
                type="submit"
                className={cn(
                  "h-9 rounded-full px-4 text-xs font-bold transition-colors",
                  a.is_active ? "bg-basil-50 text-basil-700 hover:bg-basil-100" : "bg-sand text-ink-muted hover:bg-line",
                )}
              >
                {a.is_active ? "Actif" : "Désactivé"}
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={action} className="mt-5 border-t border-line pt-5">
        <h3 className="text-sm font-bold text-ink">Créer un accès ou changer un mot de passe</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="E-mail" name="email" type="email" required
            hint="Si l'adresse existe déjà, le compte est mis à jour." />
          <Field label="Nom" name="name" required />
          <div>
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-ink-soft">Rôle</label>
            <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)} className="field">
              <option value="restaurant_admin">Responsable d&apos;établissement</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          {role === "restaurant_admin" ? (
            <div>
              <label htmlFor="restaurant_id" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Établissement
              </label>
              <select id="restaurant_id" name="restaurant_id" className="field">
                {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          ) : null}
          <Field label="Mot de passe" name="password" type="password" autoComplete="new-password"
            hint="8 caractères minimum. Laisser vide pour ne pas le changer." className="sm:col-span-2" />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <SubmitButton>Enregistrer l&apos;accès</SubmitButton>
          <StatusMessage state={state} />
        </div>
      </form>
    </Section>
  );
}
