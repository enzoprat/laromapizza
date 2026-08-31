import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Bike, ShoppingBag } from "lucide-react";
import { getOrderByToken, getOrderItems } from "@/lib/repo/orders";
import { OrderTimeline } from "@/components/site/OrderTimeline";
import { TrackPoller } from "@/components/site/TrackPoller";
import { Logo } from "@/components/ui/Logo";
import { formatPrice } from "@/lib/domain/money";
import { describeSlot } from "@/lib/domain/time";
import { mapsUrl, telHref } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suivi de ma commande",
  robots: { index: false, follow: false },
};

const STATUS_TITLE: Record<string, string> = {
  received: "Commande reçue 🍕",
  accepted: "Commande acceptée 👌",
  preparing: "En préparation 🔥",
  ready: "Votre commande est prête ✅",
  delivering: "En cours de livraison 🛵",
  completed: "Commande terminée — merci ! 🙌",
  delivered: "Commande livrée — bon appétit ! 🙌",
  cancelled: "Commande annulée",
};

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  const items = await getOrderItems([order.id]);
  const scheduled = new Date(order.scheduled_for);
  const isDelivery = order.order_type === "delivery";

  return (
    <main className="min-h-dvh bg-cream">
      <TrackPoller token={token} status={order.status} />

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Accueil La Roma Pizza">
            <Logo className="h-10" />
          </Link>
          <span className="chip bg-white text-ink-soft">Commande #{order.code}</span>
        </div>

        {/* ------------------------------------------------------------ STATUT */}
        <div className="mt-6 rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
          <h1 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
            {STATUS_TITLE[order.status] ?? "Votre commande"}
          </h1>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Restaurant</dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-ink">{order.restaurant_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {isDelivery ? "Livraison estimée" : "Retrait estimé"}
              </dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-ink">{describeSlot(scheduled)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Mode</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                {isDelivery
                  ? <><Bike className="size-4 text-basil-600" aria-hidden /> Livraison</>
                  : <><ShoppingBag className="size-4 text-rosso-600" aria-hidden /> Click & Collect</>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Total à régler</dt>
              <dd className="mt-0.5 text-[15px] font-bold text-ink">{formatPrice(order.total)}</dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-line pt-5">
            <OrderTimeline status={order.status} orderType={order.order_type} />
          </div>
        </div>

        {/* ---------------------------------------------------------- DÉTAIL */}
        <div className="mt-4 rounded-card border border-line bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink">Détail de la commande</h2>
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{item.quantity} ×</span>{" "}
                  <span className="text-ink">{item.product_name}</span>
                  {item.variant_name ? <span className="text-ink-soft"> {item.variant_name}</span> : null}
                  {item.options?.length ? (
                    <span className="block text-[13px] text-ink-muted">
                      {item.options.map((o) => o.name).join(", ")}
                    </span>
                  ) : null}
                  {item.instructions ? (
                    <span className="block text-[13px] italic text-ink-muted">« {item.instructions} »</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-ink">{formatPrice(item.line_total)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Sous-total</span>
              <span className="tabular-nums">{formatPrice(order.items_total)}</span>
            </div>
            {(order.applied_promotions ?? []).map((p, i) => (
              <div key={i} className="flex justify-between font-semibold text-basil-700">
                <span>{p.name}</span>
                <span className="tabular-nums">-{formatPrice(p.amount)}</span>
              </div>
            ))}
            {order.delivery_fee > 0 ? (
              <div className="flex justify-between text-ink-soft">
                <span>Livraison</span>
                <span className="tabular-nums">{formatPrice(order.delivery_fee)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ INFOS */}
        <div className="mt-4 rounded-card border border-line bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink">
            {isDelivery ? "Adresse de livraison" : "Où récupérer votre commande"}
          </h2>
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
            <MapPin className="mt-0.5 size-4 shrink-0 text-rosso-600" aria-hidden />
            {isDelivery ? (
              <span>
                {order.address}
                {order.address_extra ? <><br />{order.address_extra}</> : null}
                <br />{order.postal_code} {order.city}
              </span>
            ) : (
              <span>
                {order.restaurant_street}
                <br />{order.restaurant_postal_code} {order.restaurant_city}
              </span>
            )}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`tel:${telHref(order.restaurant_phone)}`} className="btn-ghost btn-sm">
              <Phone className="size-3.5" aria-hidden />
              Appeler le restaurant
            </a>
            {!isDelivery ? (
              <a
                href={mapsUrl(order.restaurant_street, order.restaurant_postal_code, order.restaurant_city)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm"
              >
                <MapPin className="size-3.5" aria-hidden />
                Itinéraire
              </a>
            ) : null}
          </div>

          <p className="mt-4 text-[13px] text-ink-muted">
            Conservez ce lien pour suivre votre commande. Paiement {isDelivery ? "à la livraison" : "au retrait"}.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href={`/restaurants/${order.restaurant_slug}`} className="btn-ghost btn-md">
            Repasser une commande
          </Link>
        </div>
      </div>
    </main>
  );
}
