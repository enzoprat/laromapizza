import { NextResponse } from "next/server";
import { requireAdmin, resolveScope } from "@/lib/auth/guard";
import { getOrderCounts, getOrderItems, listOrders } from "@/lib/repo/orders";
import type { OrderStatus, OrderType } from "@/lib/types";

export const dynamic = "force-dynamic";

const GROUPS: Record<string, OrderStatus[]> = {
  nouvelles: ["received"],
  a_venir: ["accepted"],
  preparation: ["preparing"],
  pretes: ["ready"],
  livraisons: ["delivering"],
  terminees: ["completed", "delivered"],
  annulees: ["cancelled"],
  actives: ["received", "accepted", "preparing", "ready", "delivering"],
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const restaurantId = resolveScope(auth.admin, url.searchParams.get("restaurant"));
  const group = url.searchParams.get("group") ?? "actives";
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search");

  const orders = await listOrders({
    restaurantId,
    statuses: GROUPS[group] ?? GROUPS.actives,
    orderType: type === "pickup" || type === "delivery" ? (type as OrderType) : null,
    search,
    limit: 120,
  });

  const items = await getOrderItems(orders.map((o) => o.id));
  const counts = await getOrderCounts(restaurantId);

  return NextResponse.json({
    orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })),
    counts,
    scope: restaurantId,
  });
}
