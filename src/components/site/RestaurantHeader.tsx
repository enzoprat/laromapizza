import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, Bike, Navigation, Phone, ShoppingBag } from "lucide-react";
import { Statut } from "@/components/ui/Statut";
import { Logo } from "@/components/ui/Logo";
import type { Restaurant } from "@/lib/types";
import type { OpeningStatus } from "@/lib/domain/opening";
import { mapsUrl, telHref } from "@/lib/utils";

/**
 * En-tête d'une pizzeria.
 *
 * Bandeau photographique court : on identifie le lieu, puis on descend
 * commander. Les informations pratiques sont posées dessous sur le mur, sans
 * encadrement, pour ne pas ajouter une carte de plus avant la carte.
 */
export function RestaurantHeader({
  restaurant,
  status,
}: {
  restaurant: Restaurant;
  status: OpeningStatus;
}) {
  const plages = status.todayRanges.map((r) => `${r.opens} – ${r.closes}`).join("  ·  ");

  return (
    <header>
      <div className="relative h-44 overflow-hidden bg-carbone sm:h-64">
        {restaurant.photo ? (
          <Image
            src={restaurant.photo}
            alt={`Devanture de ${restaurant.name}`}
            fill
            sizes="100vw"
            className="object-cover opacity-70"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-carbone via-carbone/45 to-carbone/30" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
          <Link
            href="/"
            aria-label="La Roma Pizza, accueil"
            className="rounded-champ bg-blanc/95 px-3 py-2 backdrop-blur"
          >
            <Logo className="h-7" />
          </Link>
          <Link href="/" className="b-clair b-s bg-blanc/95 backdrop-blur">
            <ArrowLeftRight className="size-3.5" aria-hidden />
            Changer de Roma
          </Link>
        </div>

        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[64rem] px-5 pb-5 sm:px-8 sm:pb-7">
          <Statut
            ouvert={status.isOpen}
            fermeA={status.closesAt}
            prochaine={status.nextOpening?.label}
            ton="voile"
          />
          {/* Le H1 doit contenir la marque et le mot « pizzeria » ; la ville
              reste ce que l'œil lit en premier. */}
          <h1 className="mt-2.5">
            <span className="etiquette block text-blanc/60">La Roma Pizza — pizzeria à</span>
            <span className="mt-1 block text-[2rem] font-semibold leading-[0.95] text-blanc sm:text-[3rem]">
              {restaurant.city}
              {restaurant.slug === "bordeaux-bastide" ? (
                <span className="text-blanc/70"> Bastide</span>
              ) : null}
            </span>
          </h1>
        </div>
      </div>

      <div className="border-b border-encre/10 bg-mur">
        <div className="mx-auto max-w-[64rem] px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.875rem] text-encre-2">
            <span className="font-medium text-encre">{restaurant.street}, {restaurant.postal_code}</span>
            <span className="chiffres">{plages || "Fermé aujourd'hui"}</span>
          </div>

          {status.closure ? (
            <p className="mt-3 rounded-champ bg-rosso-50 px-3.5 py-2.5 text-[0.875rem] font-medium text-rosso-700">
              Fermeture exceptionnelle{status.closure.reason ? ` — ${status.closure.reason}` : ""}.
              {status.nextOpening ? ` Réouverture ${status.nextOpening.label}.` : ""}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {restaurant.pickup_enabled ? (
              <span className="pastille bg-encre/6 text-encre-2">
                <ShoppingBag className="size-3" aria-hidden /> Click &amp; collect
              </span>
            ) : null}
            {restaurant.delivery_enabled ? (
              <span className="pastille bg-basilic-50 text-basilic-700">
                <Bike className="size-3" aria-hidden /> Livraison offerte
              </span>
            ) : null}

            <span className="flex-1" />

            <a href={`tel:${telHref(restaurant.phone)}`} className="b-contour b-s" aria-label={`Appeler au ${restaurant.phone}`}>
              <Phone className="size-3.5" aria-hidden />
              Appeler
            </a>
            <a
              href={mapsUrl(restaurant.street, restaurant.postal_code, restaurant.city)}
              target="_blank"
              rel="noopener noreferrer"
              className="b-contour b-s"
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
