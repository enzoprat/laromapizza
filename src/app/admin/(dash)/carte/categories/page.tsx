import Link from "next/link";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { sql } from "@/lib/db";
import { CategoryRow, NewCategoryForm } from "./CategoryForms";
import { Section } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await getSuperAdminOrRedirect();
  const categories = await sql<{
    id: number; slug: string; name: string; description: string | null;
    position: number; is_active: boolean; product_count: string;
  }>(
    `SELECT c.id, c.slug, c.name, c.description, c.position, c.is_active,
            (SELECT count(*) FROM products p WHERE p.category_id = c.id)::text AS product_count
     FROM categories c ORDER BY c.position, c.id`,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">Catégories</h1>
        <Link href="/admin/carte" className="btn-ghost btn-sm">Retour à la carte</Link>
      </div>

      <div className="mt-5 space-y-4">
        <NewCategoryForm />
        <Section title="Catégories existantes" description="L'ordre détermine l'affichage sur la carte en ligne.">
          {categories.map((c) => (
            <div key={c.id}>
              <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {c.slug} · {c.product_count} produits
              </p>
              <CategoryRow category={c} />
            </div>
          ))}
        </Section>
      </div>
    </main>
  );
}
