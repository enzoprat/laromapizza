import Link from "next/link";
import { Instagram, Facebook, MapPin } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SOCIAL_LINKS } from "@/lib/brand";
import type { Restaurant } from "@/lib/types";

const ICONES: Record<string, typeof Instagram> = { Instagram, Facebook };

export function SiteFooter({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <footer className="bg-carbone text-blanc">
      <div className="mx-auto max-w-[78rem] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1.4fr]">
          {/* --------------------------------------------------------- MARQUE */}
          <div>
            <div className="inline-block rounded-bloc bg-blanc px-4 py-3">
              <Logo className="h-11" />
            </div>
            <p className="mt-6 max-w-sm text-[1.0625rem] leading-relaxed text-blanc/65">
              Quatre pizzerias dans la métropole bordelaise. Pâte travaillée
              chaque jour, viande halal, livraison offerte.
            </p>

            <ul className="mt-7 flex gap-2.5">
              {SOCIAL_LINKS.map((s) => {
                const Icone = ICONES[s.name] ?? Instagram;
                return (
                  <li key={s.name}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer me"
                      aria-label={`La Roma Pizza sur ${s.name}`}
                      className="grid size-11 place-items-center rounded-full border border-blanc/18 text-blanc/70 transition-colors hover:border-blanc/45 hover:text-blanc"
                    >
                      <Icone className="size-[18px]" aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ------------------------------------------------------- ADRESSES */}
          <div>
            <h2 className="etiquette text-blanc/45">Nos quatre adresses</h2>
            <ul className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {restaurants.map((r) => (
                <li key={r.id}>
                  <Link href={`/restaurants/${r.slug}`} className="group block">
                    <p className="font-display text-[1.375rem] font-semibold text-blanc transition-colors group-hover:text-rosso-200">
                      {r.city}
                      {r.slug === "bordeaux-bastide" ? " Bastide" : ""}
                    </p>
                    <p className="mt-1 flex items-start gap-1.5 text-[0.875rem] leading-snug text-blanc/55">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span>{r.street}, {r.postal_code}</span>
                    </p>
                    <p className="mt-0.5 text-[0.875rem] text-blanc/55">{r.phone}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-blanc/12 pt-7 text-[0.8125rem] text-blanc/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} La Roma Pizza</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/mentions-legales" className="hover:text-blanc/80">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-blanc/80">Confidentialité</Link>
            <Link href="/admin" className="hover:text-blanc/80">Espace restaurant</Link>
          </nav>
        </div>

        <p className="mt-5 text-[0.75rem] leading-relaxed text-blanc/30">
          Photographies non contractuelles. Pour votre santé, évitez de grignoter
          entre les repas —{" "}
          <a href="https://www.mangerbouger.fr" target="_blank" rel="noopener noreferrer" className="underline hover:text-blanc/55">
            mangerbouger.fr
          </a>
        </p>
      </div>
    </footer>
  );
}
