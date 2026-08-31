import { NextResponse } from "next/server";
import { getOrderByToken } from "@/lib/repo/orders";

export const dynamic = "force-dynamic";

/** Statut d'une commande, consultable avec son jeton de suivi (sans compte). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Jeton manquant." }, { status: 400 });

  const order = await getOrderByToken(token);
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });

  return NextResponse.json({
    status: order.status,
    scheduledFor: order.scheduled_for,
    updatedAt: order.updated_at,
  });
}
