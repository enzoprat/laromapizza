import Link from "next/link";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { listRestaurantCards } from "@/lib/repo/restaurants";
import { sql } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatPrice } from "@/lib/domain/money";
import { AdminAccounts } from "./AdminAccounts";

export const dynamic = "force-dynamic";

export default async function EstablishmentsPage() {
  await getSuperAdminOrRedirect();
  const [restaurants, admins, stats] = await Promise.all([
    listRestaurantCards(),
    sql<{ id: number; email: string; name: string; role: string; restaurant_id: number | null; is_active: boolean; last_login_at: string | null }>(
      `SELECT id, email, name, role, restaurant_id, is_active, last_login_at FROM admins ORDER BY role, name`,
    ),
    sql<{ restaurant_id: number; orders: string; revenue: string }>(
      `SELECT restaurant_id, count(*)::text AS orders, COALESCE(sum(total),0)::text AS revenue
       FROM orders WHERE created_at > now() - interval '30 days' AND status <> 'cancelled'
       GROUP BY restaurant_id`,
    ),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Établissements</h1>
      <p className="mt-0.5 text-sm text-ink-soft">Vue d&apos;ensemble des quatre Roma et de leurs accès.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {restaurants.map((r) => {
          const stat = stats.find((s) => s.restaurant_id === r.id);
          return (
            <article key={r.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">{r.name}</h2>
                  <p className="text-sm text-ink-soft">{r.street}, {r.postal_code} {r.city}</p>
                </div>
                <StatusBadge isOpen={r.status.isOpen} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Commandes (30 j)</dt>
                  <dd className="mt-0.5 font-display text-xl font-bold text-ink">{stat?.orders ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Chiffre (30 j)</dt>
                  <dd className="mt-0.5 font-display text-xl font-bold text-ink">
                    {formatPrice(Number(stat?.revenue ?? 0))}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/admin/restaurant?r=${r.id}`} className="btn-ghost btn-sm">Paramètres</Link>
                <Link href={`/admin/disponibilite?r=${r.id}`} className="btn-ghost btn-sm">Disponibilité</Link>
                <Link href={`/restaurants/${r.slug}`} target="_blank" className="btn-ghost btn-sm">Page publique</Link>
              </div>

              <p className="mt-3 text-xs text-ink-muted">
                {r.zones.length} zone{r.zones.length > 1 ? "s" : ""} de livraison ·
                minimum {formatPrice(r.delivery_min_lunch)} le midi / {formatPrice(r.delivery_min_dinner)} le soir
                {r.online_payment_enabled ? " · paiement en ligne activé" : ""}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-6">
        <AdminAccounts
          admins={admins}
          restaurants={restaurants.map((r) => ({ id: r.id, name: r.name, city: r.city }))}
        />
      </div>
    </main>
  );
}
