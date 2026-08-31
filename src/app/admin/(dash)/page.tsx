import { getAdminOrRedirect } from "@/lib/auth/guard";
import { listRestaurants } from "@/lib/repo/restaurants";
import { OrderBoard } from "@/components/admin/OrderBoard";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await getAdminOrRedirect();
  const restaurants = admin.role === "super_admin" ? await listRestaurants() : [];

  return (
    <OrderBoard
      isSuperAdmin={admin.role === "super_admin"}
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.name, city: r.city }))}
    />
  );
}
