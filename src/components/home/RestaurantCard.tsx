import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { RestaurantCard as Card } from "@/lib/repo/restaurants";
import { telHref } from "@/lib/utils";

export function RestaurantCard({ restaurant, index }: { restaurant: Card; index: number }) {
  const { status } = restaurant;
  const ranges = status.todayRanges.map((r) => `${r.opens} – ${r.closes}`).join(" · ");

  return (
    <article
      className="card group animate-rise overflow-hidden transition-shadow duration-300 hover:shadow-lift"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Link href={`/restaurants/${restaurant.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-sand sm:aspect-[3/2]">
          {restaurant.photo ? (
            <Image
              src={restaurant.photo}
              alt={`Devanture de ${restaurant.name}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority={index < 2}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
          <div className="absolute left-3 top-3">
            <StatusBadge
              isOpen={status.isOpen}
              label={status.isOpen ? `jusqu'à ${status.closesAt}` : status.nextOpening?.label}
              className="bg-white/95 backdrop-blur"
            />
          </div>
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="font-display text-xl font-bold leading-tight text-white drop-shadow-sm">
              {restaurant.city}
              {restaurant.slug === "bordeaux-bastide" ? " Bastide" : ""}
            </h2>
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <p className="flex items-start gap-2 text-sm leading-snug text-ink-soft">
          <MapPin className="mt-0.5 size-4 shrink-0 text-rosso-600" aria-hidden />
          <span>
            {restaurant.street}
            <br />
            {restaurant.postal_code} {restaurant.city}
          </span>
        </p>

        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Clock className="size-4 shrink-0 text-rosso-600" aria-hidden />
          <span>{ranges || "Fermé aujourd'hui"}</span>
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/restaurants/${restaurant.slug}`}
            className="btn-primary btn-md flex-1"
            aria-label={`Commander chez ${restaurant.name}`}
          >
            Commander ici
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <a
            href={`tel:${telHref(restaurant.phone)}`}
            className="btn-ghost btn-md aspect-square px-0"
            aria-label={`Appeler ${restaurant.name} au ${restaurant.phone}`}
          >
            <Phone className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}
