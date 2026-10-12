import "server-only";
import { randomUUID } from "node:crypto";
import { sql, sqlOne, transaction } from "../db";
import type { PriceBreakdown } from "../orders/price";
import type { OrderStatus, OrderType } from "../types";
import { jsonArray } from "../db/json";

export type OrderCustomer = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  addressExtra?: string | null;
  postalCode?: string | null;
  city?: string | null;
  notes?: string | null;
};

export type CreatedOrder = {
  id: number;
  code: string;
  publicToken: string;
  scheduledFor: string;
  total: number;
};

export type OrderRow = {
  id: number; code: string; public_token: string; restaurant_id: number;
  restaurant_name: string; restaurant_slug: string; restaurant_phone: string;
  restaurant_street: string; restaurant_city: string; restaurant_postal_code: string;
  order_type: OrderType; status: OrderStatus;
  first_name: string; last_name: string; phone: string; email: string | null;
  address: string | null; address_extra: string | null; postal_code: string | null; city: string | null;
  scheduled_for: string; asap: boolean;
  items_total: number; discount_total: number; delivery_fee: number; total: number;
  applied_promotions: { name: string; amount: number; detail: string }[];
  payment_method: string; payment_status: string; notes: string | null;
  created_at: string; updated_at: string;
};

export type OrderItemRow = {
  id: number; order_id: number; product_name: string; variant_name: string | null;
  quantity: number; unit_price: number; line_total: number; instructions: string | null;
  options: { name: string; price_delta: number; kind: string }[];
};

const ORDER_COLUMNS = `o.id, o.code, o.public_token, o.restaurant_id,
  r.name AS restaurant_name, r.slug AS restaurant_slug, r.phone AS restaurant_phone,
  r.street AS restaurant_street, r.city AS restaurant_city, r.postal_code AS restaurant_postal_code,
  o.order_type, o.status, o.first_name, o.last_name, o.phone, o.email,
  o.address, o.address_extra, o.postal_code, o.city,
  o.scheduled_for, o.asap, o.items_total, o.discount_total, o.delivery_fee, o.total,
  o.applied_promotions, o.payment_method, o.payment_status, o.notes,
  o.created_at, o.updated_at`;

export async function createOrder(params: {
  restaurantId: number;
  orderType: OrderType;
  scheduledFor: Date;
  asap: boolean;
  customer: OrderCustomer;
  breakdown: PriceBreakdown;
  deliveryZoneId?: number | null;
  paymentMethod?: "on_site" | "online";
}): Promise<CreatedOrder> {
  const { restaurantId, orderType, scheduledFor, asap, customer, breakdown } = params;

  return transaction(async (tx) => {
    // Numéro de commande : un seul compteur, incrémenté atomiquement.
    const [counter] = await tx.query<{ value: number }>(
      `UPDATE counters SET value = value + 1 WHERE name = 'order_number' RETURNING value`,
    );
    const code = `R${counter.value}`;
    const publicToken = randomUUID();

    // Le client est identifié par son téléphone : pas de compte, pas de mot de passe.
    const [customerRow] = await tx.query<{ id: number }>(
      `INSERT INTO customers (phone, first_name, last_name, email, orders_count, last_order_at)
       VALUES ($1,$2,$3,$4,1,now())
       ON CONFLICT (phone) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             last_name  = COALESCE(EXCLUDED.last_name, customers.last_name),
             email      = COALESCE(EXCLUDED.email, customers.email),
             orders_count = customers.orders_count + 1,
             last_order_at = now()
       RETURNING id`,
      [customer.phone, customer.firstName, customer.lastName, customer.email ?? null],
    );

    const [order] = await tx.query<{ id: number; code: string; scheduled_for: string }>(
      `INSERT INTO orders
         (code, restaurant_id, customer_id, public_token, order_type, status,
          first_name, last_name, phone, email,
          address, address_extra, postal_code, city, delivery_zone_id,
          scheduled_for, asap, items_total, discount_total, delivery_fee, total,
          applied_promotions, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,'received',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23)
       RETURNING id, code, scheduled_for`,
      [
        code, restaurantId, customerRow.id, publicToken, orderType,
        customer.firstName, customer.lastName, customer.phone, customer.email ?? null,
        customer.address ?? null, customer.addressExtra ?? null,
        customer.postalCode ?? null, customer.city ?? null, params.deliveryZoneId ?? null,
        scheduledFor.toISOString(), asap,
        breakdown.itemsTotal, breakdown.discountTotal, breakdown.deliveryFee, breakdown.total,
        JSON.stringify(breakdown.applied), params.paymentMethod ?? "on_site",
        customer.notes ?? null,
      ],
    );

    for (const [position, line] of breakdown.lines.entries()) {
      const [item] = await tx.query<{ id: number }>(
        `INSERT INTO order_items
           (order_id, product_id, variant_id, product_name, variant_name,
            quantity, unit_price, line_total, instructions, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [order.id, line.productId, line.variantId, line.productName, line.variantName,
         line.quantity, line.unitPrice, line.lineTotal, line.instructions, position],
      );
      for (const opt of line.options) {
        await tx.query(
          `INSERT INTO order_item_options (order_item_id, kind, ref_id, name, price_delta)
           VALUES ($1,$2,$3,$4,$5)`,
          [item.id, opt.kind, opt.refId, opt.name, opt.priceDelta],
        );
      }
    }

    await tx.query(
      `INSERT INTO order_events (order_id, status, actor) VALUES ($1,'received','client')`,
      [order.id],
    );

    return {
      id: order.id, code: order.code, publicToken,
      scheduledFor: scheduledFor.toISOString(), total: breakdown.total,
    };
  });
}

/** Les colonnes JSON sont normalisées ici, une fois pour toutes. */
function normaliser(o: OrderRow | null): OrderRow | null {
  return o ? { ...o, applied_promotions: jsonArray(o.applied_promotions) } : null;
}

export async function getOrderByToken(token: string): Promise<OrderRow | null> {
  return normaliser(await sqlOne<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.public_token = $1`, [token],
  ));
}

export async function getOrderById(id: number): Promise<OrderRow | null> {
  return normaliser(await sqlOne<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.id = $1`, [id],
  ));
}

export async function getOrderItems(orderIds: number[]): Promise<OrderItemRow[]> {
  if (!orderIds.length) return [];
  const lignes = await sql<OrderItemRow>(
    `SELECT i.id, i.order_id, i.product_name, i.variant_name, i.quantity,
            i.unit_price, i.line_total, i.instructions,
            COALESCE(
              (SELECT json_agg(json_build_object('name', o.name, 'price_delta', o.price_delta, 'kind', o.kind)
                               ORDER BY o.id)
               FROM order_item_options o WHERE o.order_item_id = i.id),
              '[]'::json
            ) AS options
     FROM order_items i
     WHERE i.order_id = ANY($1)
     ORDER BY i.order_id, i.position, i.id`,
    [orderIds],
  );
  return lignes.map((l) => ({ ...l, options: jsonArray(l.options) }));
}

export async function getOrderEvents(orderId: number) {
  return sql<{ status: OrderStatus; created_at: string }>(
    `SELECT status, created_at FROM order_events WHERE order_id = $1 ORDER BY created_at, id`,
    [orderId],
  );
}

/** Commandes déjà planifiées par créneau — sert au contrôle de capacité. */
export async function getSlotLoad(restaurantId: number, from: Date, to: Date) {
  const rows = await sql<{ slot: string; count: string }>(
    `SELECT scheduled_for AS slot, count(*)::text AS count
     FROM orders
     WHERE restaurant_id = $1 AND scheduled_for BETWEEN $2 AND $3
       AND status NOT IN ('cancelled')
     GROUP BY scheduled_for`,
    [restaurantId, from.toISOString(), to.toISOString()],
  );
  const load: Record<string, number> = {};
  for (const r of rows) load[new Date(r.slot).toISOString()] = Number(r.count);
  return load;
}

export type OrderListFilters = {
  restaurantId?: number | null;
  statuses?: OrderStatus[];
  orderType?: OrderType | null;
  search?: string | null;
  limit?: number;
  since?: string | null;
};

export async function listOrders(filters: OrderListFilters): Promise<OrderRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.restaurantId) { params.push(filters.restaurantId); where.push(`o.restaurant_id = $${params.length}`); }
  if (filters.statuses?.length) { params.push(filters.statuses); where.push(`o.status = ANY($${params.length})`); }
  if (filters.orderType) { params.push(filters.orderType); where.push(`o.order_type = $${params.length}`); }
  if (filters.since) { params.push(filters.since); where.push(`o.updated_at > $${params.length}`); }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(o.code ILIKE $${params.length} OR o.phone ILIKE $${params.length}
                 OR o.first_name ILIKE $${params.length} OR o.last_name ILIKE $${params.length})`);
  }
  params.push(Math.min(filters.limit ?? 100, 300));

  const commandes = await sql<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY o.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return commandes.map((o) => ({ ...o, applied_promotions: jsonArray(o.applied_promotions) }));
}

const TIMESTAMP_BY_STATUS: Partial<Record<OrderStatus, string>> = {
  accepted: "accepted_at",
  ready: "ready_at",
  completed: "completed_at",
  delivered: "completed_at",
};

export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
  actor: string,
  reason?: string | null,
): Promise<OrderRow | null> {
  const stamp = TIMESTAMP_BY_STATUS[status];
  await sql(
    `UPDATE orders SET status = $2, updated_at = now(),
       cancel_reason = CASE WHEN $2 = 'cancelled' THEN $3 ELSE cancel_reason END
       ${stamp ? `, ${stamp} = COALESCE(${stamp}, now())` : ""}
     WHERE id = $1`,
    [orderId, status, reason ?? null],
  );
  await sql(`INSERT INTO order_events (order_id, status, actor) VALUES ($1,$2,$3)`, [orderId, status, actor]);
  return getOrderById(orderId);
}

/** Compteurs du tableau de bord. */
export async function getOrderCounts(restaurantId: number | null) {
  const rows = await sql<{ status: OrderStatus; count: string }>(
    `SELECT status, count(*)::text AS count FROM orders
     WHERE ($1::int IS NULL OR restaurant_id = $1)
       AND created_at > now() - interval '2 days'
     GROUP BY status`,
    [restaurantId],
  );
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = Number(r.count);
  return counts;
}
