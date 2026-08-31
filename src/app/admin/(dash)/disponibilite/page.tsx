import Link from "next/link";
import { getAdminOrRedirect } from "@/lib/auth/guard";
import { listRestaurants } from "@/lib/repo/restaurants";
import { listAvailability } from "@/lib/repo/admin";
import { AvailabilityBoard } from "./AvailabilityBoard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const admin = await getAdminOrRedirect();
  const { r } = await searchParams;
  const all = admin.role === "super_admin" ? await listRestaurants() : [];

  const restaurantId = admin.role === "super_admin" ? Number(r) || all[0]?.id : admin.restaurant_id!;
  const items = await listAvailability(restaurantId);
  const current = all.find((x) => x.id === restaurantId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Disponibilité des produits</h1>
      <p className="mt-1 text-sm text-ink-soft">
        « Rupture » retire immédiatement un produit de la carte en ligne, sans le supprimer.
        Décocher « À la carte » le retire durablement de cet établissement.
      </p>

      {admin.role === "super_admin" ? (
        <nav className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" aria-label="Choisir un établissement">
          {all.map((item) => (
            <Link key={item.id} href={`/admin/disponibilite?r=${item.id}`}
              className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                item.id === restaurantId ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-sand")}>
              {item.city}{item.slug === "bordeaux-bastide" ? " Bastide" : ""}
            </Link>
          ))}
        </nav>
      ) : null}

      {current || admin.role !== "super_admin" ? (
        <AvailabilityBoard restaurantId={restaurantId} items={items} />
      ) : null}
    </main>
  );
}
