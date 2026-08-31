import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "Connexion — Espace restaurant",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo className="h-14" priority />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-ink">Espace restaurant</h1>
        <p className="mt-1.5 text-center text-sm text-ink-soft">
          Connectez-vous pour gérer vos commandes.
        </p>
        <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
