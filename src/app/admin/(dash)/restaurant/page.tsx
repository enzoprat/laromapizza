import Link from "next/link";
import { getAdminOrRedirect } from "@/lib/auth/guard";
import { getHours, getRestaurantById, getZones, listRestaurants } from "@/lib/repo/restaurants";
import { listClosures } from "@/lib/repo/admin";
import { ClosuresPanel, HoursForm, SettingsForm, ZonesPanel } from "./RestaurantForms";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RestaurantSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const admin = await getAdminOrRedirect();
  const { r } = await searchParams;
  const all = await listRestaurants();

  const restaurantId =
    admin.role === "super_admin"
      ? Number(r) || all[0]?.id
      : admin.restaurant_id!;

  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return <main className="p-6">Établissement introuvable.</main>;

  const [hours, zones, closures] = await Promise.all([
    getHours(restaurant.id),
    getZones(restaurant.id),
    listClosures(restaurant.id),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">{restaurant.name}</h1>
        <Link href={`/restaurants/${restaurant.slug}`} target="_blank" className="btn-ghost btn-sm">
          Voir la page publique
        </Link>
      </div>

      {admin.role === "super_admin" ? (
        <nav className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" aria-label="Choisir un établissement">
          {all.map((item) => (
            <Link
              key={item.id}
              href={`/admin/restaurant?r=${item.id}`}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                item.id === restaurant.id ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-sand",
              )}
            >
              {item.city}{item.slug === "bordeaux-bastide" ? " Bastide" : ""}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="mt-5 space-y-4">
        <SettingsForm restaurant={restaurant} isSuper={admin.role === "super_admin"} />
        <HoursForm restaurant={restaurant} hours={hours} />
        <ClosuresPanel restaurant={restaurant} closures={closures} />
        {restaurant.delivery_enabled ? <ZonesPanel restaurant={restaurant} zones={zones} /> : null}
      </div>
    </main>
  );
}
