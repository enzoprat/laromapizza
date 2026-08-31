import Link from "next/link";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { sql } from "@/lib/db";
import { ExtraRow, NewExtraForm } from "./ExtraForms";
import { Section } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ExtrasPage() {
  await getSuperAdminOrRedirect();
  const extras = await sql<{
    id: number; name: string; category: string; is_active: boolean;
    price_by_size: Record<string, number>; price_default: number;
  }>(
    `SELECT id, name, category, is_active, price_by_size, price_default
     FROM product_extras ORDER BY category, position, id`,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">Suppléments</h1>
        <Link href="/admin/carte" className="btn-ghost btn-sm">Retour à la carte</Link>
      </div>

      <div className="mt-5 space-y-4">
        <NewExtraForm />
        <Section title={`${extras.length} suppléments`} description="Tarif appliqué selon la taille de la pizza.">
          {extras.map((e) => <ExtraRow key={e.id} extra={{ ...e, price_default: Number(e.price_default) }} />)}
        </Section>
      </div>
    </main>
  );
}
