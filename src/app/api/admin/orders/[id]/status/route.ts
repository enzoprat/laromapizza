import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { canAccessRestaurant } from "@/lib/auth/session";
import { getOrderById, updateOrderStatus } from "@/lib/repo/orders";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum([
    "accepted", "preparing", "ready", "delivering",
    "completed", "delivered", "cancelled",
  ]),
  reason: z.string().max(200).nullable().optional(),
});

/** Enchaînements autorisés : on ne saute pas d'étape, on n'annule pas après coup. */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  received: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "delivering", "cancelled"],
  ready: ["completed", "delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
  completed: [],
  delivered: [],
  cancelled: [],
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  if (!canAccessRestaurant(auth.admin, order.restaurant_id)) {
    return NextResponse.json({ error: "Cette commande ne relève pas de votre établissement." }, { status: 403 });
  }

  if (!ALLOWED[order.status].includes(parsed.data.status)) {
    return NextResponse.json(
      { error: `Passage de « ${order.status} » à « ${parsed.data.status} » impossible.` },
      { status: 409 },
    );
  }

  const updated = await updateOrderStatus(
    orderId,
    parsed.data.status,
    auth.admin.email,
    parsed.data.reason ?? null,
  );
  return NextResponse.json({ order: updated });
}
