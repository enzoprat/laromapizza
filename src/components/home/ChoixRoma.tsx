import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bike, ShoppingBag } from "lucide-react";
import { Statut } from "@/components/ui/Statut";
import { Reveal } from "@/components/ui/Reveal";
import type { RestaurantCard } from "@/lib/repo/restaurants";

/**
 * Le choix de l'établissement.
 *
 * Pas une grille de cartes : une sélection numérotée. La photo de devanture
 * porte le bloc, les informations se posent dessous à même le mur, sans
 * encadrement. On reconnaît un lieu, pas un composant.
 */
export function ChoixRoma({ restaurants }: { restaurants: RestaurantCard[] }) {
  return (
    <section id="roma" className="mx-auto max-w-[78rem] scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="etiquette text-rosso">Première étape</p>
          <h2 className="mt-3 max-w-[13ch] text-[2.25rem] font-semibold leading-[0.98] sm:text-[3.25rem]">
            Choisissez votre Roma
          </h2>
        </div>
        <p className="max-w-xs text-[0.9375rem] leading-relaxed text-encre-2">
          Chacune a sa carte, ses horaires et sa zone de livraison.
          Le choix est mémorisé jusqu&apos;au bout de la commande.
        </p>
      </Reveal>

      <ul className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {restaurants.map((r, i) => {
          const horaires = r.status.todayRanges.map((h) => `${h.opens}–${h.closes}`).join("  ·  ");
          return (
            <Reveal as="li" key={r.id} delay={i * 70}>
              <Link href={`/restaurants/${r.slug}`} className="group block">
                {/* Format natif des clichés de devanture (4:3) : les forcer en
                    portrait obligeait à les agrandir, et cela se voyait. */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-bloc bg-carbone">
                  {r.photo ? (
                    <Image
                      src={r.photo}
                      alt={`Devanture de ${r.name}`}
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 23vw"
                      className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                      priority={i < 2}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-carbone/85 via-carbone/10 to-carbone/25" />

                  <span className="absolute left-3.5 top-3.5">
                    <Statut
                      ouvert={r.status.isOpen}
                      fermeA={r.status.closesAt}
                      prochaine={r.status.nextOpening?.label}
                      ton="voile"
                      compact
                    />
                  </span>

                  <span className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
                    <span>
                      <span className="block font-display text-[0.6875rem] font-bold tracking-[0.2em] text-blanc/55">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-0.5 block font-display text-[1.75rem] font-semibold leading-none text-blanc">
                        {r.city}
                        {r.slug === "bordeaux-bastide" ? (
                          <span className="block text-[1.125rem] font-normal text-blanc/75">Bastide</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blanc/95 text-encre transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:bg-rosso group-hover:text-blanc">
                      <ArrowUpRight className="size-4" aria-hidden />
                    </span>
                  </span>
                </div>

                <div className="mt-4 px-0.5">
                  <p className="text-[0.9375rem] font-medium leading-snug text-encre">
                    {r.street}
                  </p>
                  <p className="chiffres mt-1 text-[0.875rem] text-encre-2">
                    {horaires || "Fermé aujourd'hui"}
                  </p>
                  <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem] font-medium text-encre-3">
                    {r.pickup_enabled ? (
                      <span className="inline-flex items-center gap-1">
                        <ShoppingBag className="size-3" aria-hidden /> Click &amp; collect
                      </span>
                    ) : null}
                    {r.delivery_enabled ? (
                      <span className="inline-flex items-center gap-1">
                        <Bike className="size-3" aria-hidden /> Livraison offerte
                      </span>
                    ) : null}
                  </p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
