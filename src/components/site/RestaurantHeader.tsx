import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, MapPin, Navigation, Phone, ShoppingBag, Bike } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Logo } from "@/components/ui/Logo";
import type { Restaurant } from "@/lib/types";
import type { OpeningStatus } from "@/lib/domain/opening";
import { mapsUrl, telHref } from "@/lib/utils";

export function RestaurantHeader({
  restaurant,
  status,
}: {
  restaurant: Restaurant;
  status: OpeningStatus;
}) {
  const ranges = status.todayRanges.map((r) => `${r.opens} – ${r.closes}`).join(" · ");

  return (
    <header>
      {/* Bandeau photo : compact sur mobile, on va droit à la commande. */}
      <div className="relative h-36 overflow-hidden bg-ink sm:h-56">
        {restaurant.photo ? (
          <Image
            src={restaurant.photo}
            alt={`Devanture de ${restaurant.name}`}
            fill
            sizes="100vw"
            className="object-cover opacity-80"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/25" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link href="/" aria-label="Accueil La Roma Pizza" className="rounded-lg bg-white/95 px-2.5 py-1.5 backdrop-blur">
            <Logo className="h-7" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-ink backdrop-blur transition-transform active:scale-95"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden />
            Changer de Roma
          </Link>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <StatusBadge
            isOpen={status.isOpen}
            label={status.isOpen ? `jusqu'à ${status.closesAt}` : status.nextOpening?.label}
            className="bg-white/95 backdrop-blur"
          />
          <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight text-white sm:text-4xl">
            {restaurant.name}
          </h1>
        </div>
      </div>

      {/* Informations pratiques */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0 text-rosso-600" aria-hidden />
              {restaurant.street}, {restaurant.postal_code} {restaurant.city}
            </span>
            <span className="text-ink-muted">{ranges || "Fermé aujourd'hui"}</span>
          </div>

          {status.closure ? (
            <p className="mt-3 rounded-xl bg-rosso-50 px-3.5 py-2.5 text-sm font-medium text-rosso-700">
              Fermeture exceptionnelle{status.closure.reason ? ` — ${status.closure.reason}` : ""}.
              {status.nextOpening ? ` Réouverture ${status.nextOpening.label}.` : ""}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {restaurant.pickup_enabled ? (
              <span className="chip bg-sand text-ink-soft">
                <ShoppingBag className="size-3" aria-hidden /> Click &amp; collect
              </span>
            ) : null}
            {restaurant.delivery_enabled ? (
              <span className="chip bg-sand text-ink-soft">
                <Bike className="size-3" aria-hidden /> Livraison
              </span>
            ) : null}

            <span className="flex-1" />

            <a
              href={`tel:${telHref(restaurant.phone)}`}
              className="btn-ghost btn-sm"
              aria-label={`Appeler au ${restaurant.phone}`}
            >
              <Phone className="size-3.5" aria-hidden />
              Appeler
            </a>
            <a
              href={mapsUrl(restaurant.street, restaurant.postal_code, restaurant.city)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm"
            >
              <Navigation className="size-3.5" aria-hidden />
              Itinéraire
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
