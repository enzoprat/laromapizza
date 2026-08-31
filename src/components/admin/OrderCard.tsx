"use client";

import { Bike, ShoppingBag, Phone, MapPin, Printer, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/domain/money";
import { timeInParis, describeSlot } from "@/lib/domain/time";
import type { OrderStatus, OrderType } from "@/lib/types";

export type AdminOrder = {
  id: number; code: string; order_type: OrderType; status: OrderStatus;
  first_name: string; last_name: string; phone: string;
  address: string | null; address_extra: string | null; postal_code: string | null; city: string | null;
  scheduled_for: string; created_at: string; asap: boolean;
  items_total: number; discount_total: number; delivery_fee: number; total: number;
  applied_promotions: { name: string; amount: number }[];
  notes: string | null;
  restaurant_name: string;
  items: {
    id: number; product_name: string; variant_name: string | null; quantity: number;
    line_total: number; instructions: string | null;
    options: { name: string; price_delta: number; kind: string }[];
  }[];
};

/** Boutons proposés selon l'état, et selon emporter ou livraison. */
export function nextActions(order: AdminOrder): { status: OrderStatus; label: string; tone: "primary" | "ghost" | "danger" }[] {
  switch (order.status) {
    case "received":
      return [
        { status: "accepted", label: "Accepter", tone: "primary" },
        { status: "cancelled", label: "Refuser", tone: "danger" },
      ];
    case "accepted":
      return [{ status: "preparing", label: "En préparation", tone: "primary" }];
    case "preparing":
      return order.order_type === "delivery"
        ? [{ status: "delivering", label: "En livraison", tone: "primary" }]
        : [{ status: "ready", label: "Prête", tone: "primary" }];
    case "ready":
      return [{ status: "completed", label: "Terminée", tone: "primary" }];
    case "delivering":
      return [{ status: "delivered", label: "Livrée", tone: "primary" }];
    default:
      return [];
  }
}

export function OrderCard({
  order,
  onStatus,
  onPrint,
  busy,
  showRestaurant,
}: {
  order: AdminOrder;
  onStatus: (id: number, status: OrderStatus) => void;
  onPrint: (order: AdminOrder) => void;
  busy: boolean;
  showRestaurant: boolean;
}) {
  const isDelivery = order.order_type === "delivery";
  const isNew = order.status === "received";
  const scheduled = new Date(order.scheduled_for);

  return (
    <article
      className={cn(
        "rounded-card border-2 bg-white shadow-card transition-shadow",
        isNew ? "border-rosso-600 shadow-lift" : "border-line",
      )}
    >
      {/* ------------------------------------------------------------ EN-TÊTE */}
      <div className={cn("flex items-start gap-3 rounded-t-[0.85rem] px-4 py-3", isNew ? "bg-rosso-50" : "bg-sand/60")}>
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl text-white",
            isDelivery ? "bg-basil-600" : "bg-rosso-600",
          )}
          title={isDelivery ? "Livraison" : "Click & Collect"}
        >
          {isDelivery ? <Bike className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-extrabold leading-tight text-ink">
            #{order.code}
            <span className="ml-2 text-base font-bold text-ink-soft">
              {order.first_name} {order.last_name}
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm font-semibold text-ink-soft">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {timeInParis(scheduled)}
              {order.asap ? <span className="font-normal text-ink-muted"> (dès que possible)</span> : null}
            </span>
            <span className="font-normal text-ink-muted">reçue à {timeInParis(new Date(order.created_at))}</span>
            {showRestaurant ? <span className="font-normal text-ink-muted">{order.restaurant_name}</span> : null}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-extrabold tabular-nums text-ink">{formatPrice(order.total)}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {isDelivery ? "Livraison" : "À emporter"}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------ CONTENU */}
      <div className="px-4 py-3">
        <ul className="space-y-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0 text-[15px] leading-snug">
                <span className="font-extrabold text-ink">{item.quantity}×</span>{" "}
                <span className="font-semibold text-ink">{item.product_name}</span>
                {item.variant_name ? <span className="text-ink-soft"> {item.variant_name}</span> : null}
                {item.options.length ? (
                  <span className="block text-[13px] text-ink-soft">
                    {item.options.map((o) => o.name).join(" · ")}
                  </span>
                ) : null}
                {item.instructions ? (
                  <span className="mt-0.5 flex items-start gap-1 text-[13px] font-semibold text-rosso-700">
                    <MessageSquare className="mt-0.5 size-3 shrink-0" aria-hidden />
                    {item.instructions}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums text-[15px] text-ink-soft">{formatPrice(item.line_total)}</span>
            </li>
          ))}
        </ul>

        {order.applied_promotions?.length ? (
          <p className="mt-2 text-[13px] font-semibold text-basil-700">
            {order.applied_promotions.map((p) => `${p.name} (-${formatPrice(p.amount)})`).join(" · ")}
          </p>
        ) : null}

        {order.notes ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-900">
            Note : {order.notes}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-sm">
          <a href={`tel:${order.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 font-semibold text-ink hover:text-rosso-600">
            <Phone className="size-3.5" aria-hidden />
            {order.phone}
          </a>
          {isDelivery && order.address ? (
            <span className="flex items-start gap-1.5 text-ink-soft">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-basil-600" aria-hidden />
              <span>
                {order.address}
                {order.address_extra ? ` — ${order.address_extra}` : ""}, {order.postal_code} {order.city}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------ ACTIONS */}
      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        {nextActions(order).map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={busy}
            onClick={() => {
              if (action.tone === "danger" && !confirm(`Refuser la commande #${order.code} ?`)) return;
              onStatus(order.id, action.status);
            }}
            className={cn(
              "h-12 flex-1 rounded-full px-5 text-[15px] font-bold transition-all active:scale-[0.98] disabled:opacity-50",
              action.tone === "primary" && "bg-basil-600 text-white hover:bg-basil-700",
              action.tone === "danger" && "max-w-[10rem] border border-line bg-white text-rosso-600 hover:bg-rosso-50",
            )}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPrint(order)}
          aria-label={`Imprimer le ticket de la commande ${order.code}`}
          className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:bg-sand hover:text-ink"
        >
          <Printer className="size-5" aria-hidden />
        </button>
      </div>

      <p className="px-4 pb-3 text-xs text-ink-muted">{describeSlot(scheduled)}</p>
    </article>
  );
}
