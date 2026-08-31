"use client";

import { formatPrice } from "@/lib/domain/money";
import { timeInParis } from "@/lib/domain/time";
import type { AdminOrder } from "./OrderCard";

/**
 * Ticket cuisine. Caché à l'écran, il n'apparaît qu'à l'impression
 * (voir les règles @media print dans globals.css) : format étroit, gros
 * caractères, pas de couleur.
 */
export function Ticket({ order }: { order: AdminOrder | null }) {
  if (!order) return null;
  const isDelivery = order.order_type === "delivery";

  return (
    <div id="ticket" aria-hidden className="hidden">
      <h1>#{order.code}</h1>
      <p className="ticket-mode">{isDelivery ? "LIVRAISON" : "À EMPORTER"}</p>
      <p>{order.restaurant_name}</p>
      <hr />
      <p>
        <strong>{isDelivery ? "Livraison" : "Retrait"} : {timeInParis(new Date(order.scheduled_for))}</strong>
        {order.asap ? " (dès que possible)" : ""}
      </p>
      <p>Reçue à {timeInParis(new Date(order.created_at))}</p>
      <hr />
      <p><strong>{order.first_name} {order.last_name}</strong></p>
      <p>{order.phone}</p>
      {isDelivery && order.address ? (
        <p>
          {order.address}
          {order.address_extra ? <><br />{order.address_extra}</> : null}
          <br />{order.postal_code} {order.city}
        </p>
      ) : null}
      <hr />
      <table>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="qty">{item.quantity}×</td>
              <td>
                <strong>{item.product_name}</strong>
                {item.variant_name ? ` ${item.variant_name}` : ""}
                {item.options.length ? <><br /><span className="opt">{item.options.map((o) => o.name).join(", ")}</span></> : null}
                {item.instructions ? <><br /><span className="note">➜ {item.instructions}</span></> : null}
              </td>
              <td className="amount">{formatPrice(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <p>Sous-total : {formatPrice(order.items_total)}</p>
      {order.applied_promotions?.map((p, i) => (
        <p key={i}>{p.name} : -{formatPrice(p.amount)}</p>
      ))}
      {order.delivery_fee > 0 ? <p>Livraison : {formatPrice(order.delivery_fee)}</p> : null}
      <p className="total">TOTAL : {formatPrice(order.total)}</p>
      <p>À régler {isDelivery ? "à la livraison" : "au retrait"}</p>
      {order.notes ? <><hr /><p className="note">Note : {order.notes}</p></> : null}
    </div>
  );
}
