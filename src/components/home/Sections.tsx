import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bike, Phone, ShoppingBag } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { VerifZone } from "./VerifZone";
import { formatPrice } from "@/lib/domain/money";
import type { CategorySummary, HighlightProduct, PublicPromotion, ServedArea } from "@/lib/repo/home";
import { telHref } from "@/lib/utils";

/* ============================================================== HERO ======= */

/**
 * Hero.
 *
 * Composition en deux temps : la parole à gauche sur le ton du mur, la
 * photographie à droite à fond perdu. L'arête entre les deux est franche et
 * assumée — chercher à fondre un mur photographié dans un aplat ne produit
 * qu'une couture hasardeuse.
 */
export function Hero({ telephone }: { telephone: string }) {
  return (
    <section className="relative overflow-hidden bg-mur">
      {/* Panneau photographique, à fond perdu jusqu'au bord droit. */}
      <div className="absolute inset-y-0 right-0 hidden w-[46%] lg:block xl:w-[48%]">
        <Image
          src="/img/food/produits/roma.webp"
          alt="Pizza Roma : viande hachée, poulet, poivrons, crème fraîche et olives"
          fill
          sizes="48vw"
          className="object-cover object-center"
          priority
        />
      </div>

      <div className="relative mx-auto max-w-[78rem] px-5 sm:px-8">
        <div className="flex min-h-[34rem] max-w-xl flex-col justify-center py-12 lg:min-h-[41rem] lg:py-16">
          <p className="etiquette anim-monte text-rosso">
            Pizzeria à Bordeaux, Bègles &amp; Cenon
          </p>

          {/* Le H1 porte la marque et les villes ; la ligne d'accroche la voix. */}
          <h1 className="anim-monte mt-4 text-[3.25rem] font-semibold leading-[0.88] tracking-[-0.035em] text-encre sm:text-[4.5rem] lg:text-[5.5rem]">
            Une faim.
            <br />
            <span className="text-rosso">Quatre Roma.</span>
          </h1>

          <p className="anim-monte mt-6 max-w-md text-[1.0625rem] leading-relaxed text-encre-2 sm:text-[1.1875rem]">
            Pâte travaillée chaque jour, viande halal, cuisson à la commande.
            À récupérer sur place ou livré chez vous, sans frais et sans créer de compte.
          </p>

          <div className="anim-monte mt-8 flex flex-wrap items-center gap-3">
            <a href="#roma" className="b-rouge b-xl">
              Choisir ma pizzeria
              <ArrowRight className="size-[18px]" aria-hidden />
            </a>
            <a href={`tel:${telHref(telephone)}`} className="b-contour b-xl">
              <Phone className="size-[18px]" aria-hidden />
              <span className="hidden sm:inline">Commander par téléphone</span>
              <span className="sm:hidden">Appeler</span>
            </a>
          </div>

          <div className="anim-monte mt-10 max-w-sm border-t border-encre/12 pt-7">
            <VerifZone />
          </div>
        </div>
      </div>

      {/* Sur mobile la photographie devient une bande pleine largeur. */}
      <div className="relative h-56 w-full sm:h-72 lg:hidden">
        <Image
          src="/img/food/produits/roma.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}

/* ==================================================== BANDEAU DES OFFRES === */

export function BandeauOffres({ promotions }: { promotions: PublicPromotion[] }) {
  if (!promotions.length) return null;

  return (
    <section className="bg-rosso text-blanc" aria-labelledby="offres">
      <div className="mx-auto max-w-[78rem] px-5 py-14 sm:px-8 sm:py-20">
        <Reveal>
          <p className="etiquette text-blanc/60">En ce moment</p>
          <h2 id="offres" className="mt-3 max-w-[16ch] text-[2.25rem] font-semibold leading-[0.98] sm:text-[3.5rem]">
            Les offres de la maison
          </h2>
        </Reveal>

        <ul className="mt-12 divide-y divide-blanc/20 border-y border-blanc/20">
          {promotions.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 80}>
              <div className="flex flex-col gap-3 py-7 sm:flex-row sm:items-baseline sm:gap-10">
                <span className="chiffres shrink-0 font-display text-[0.8125rem] font-bold tracking-[0.2em] text-blanc/45">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <h3 className="text-[1.625rem] font-semibold leading-tight sm:text-[2.125rem]">
                    {p.name}
                  </h3>
                  {p.description ? (
                    <p className="mt-1.5 max-w-xl text-[0.9375rem] leading-relaxed text-blanc/70">
                      {p.description}
                    </p>
                  ) : null}
                </div>
                <p className="flex shrink-0 flex-wrap gap-2">
                  {p.order_types.includes("pickup") ? (
                    <span className="pastille border border-blanc/30 px-2.5 py-1 text-blanc/85">
                      <ShoppingBag className="size-3" aria-hidden /> À emporter
                    </span>
                  ) : null}
                  {p.order_types.includes("delivery") ? (
                    <span className="pastille border border-blanc/30 px-2.5 py-1 text-blanc/85">
                      <Bike className="size-3" aria-hidden /> En livraison
                    </span>
                  ) : null}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>

        <p className="mt-8 text-[0.875rem] text-blanc/60">
          Appliquées automatiquement au panier. Aucun code à saisir.
        </p>
      </div>
    </section>
  );
}

/* ============================================================ PROMESSE ==== */

export function Promesse({ vitrine }: { vitrine: { src: string; alt: string } | null }) {
  const etapes = [
    { t: "Vous choisissez", d: "Votre pizzeria, puis vos pizzas. Le prix se met à jour à chaque supplément, sans surprise à la fin." },
    { t: "On prépare", d: "La commande tombe directement en cuisine. Vous choisissez l'heure exacte de retrait ou de livraison." },
    { t: "Vous récupérez", d: "Sur place ou chez vous. Le paiement se fait à la remise : espèces, carte ou titres restaurant." },
  ];

  return (
    <section className="bg-carbone text-blanc" aria-labelledby="fonctionnement">
      <div className="mx-auto grid max-w-[78rem] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.8fr] lg:gap-20">
        <div>
          <Reveal>
            <p className="etiquette text-blanc/45">Sans compte, sans friction</p>
            <h2 id="fonctionnement" className="mt-3 max-w-[14ch] text-[2.25rem] font-semibold leading-[0.98] sm:text-[3.25rem]">
              Commander prend deux minutes
            </h2>
          </Reveal>

          <ol className="mt-12 space-y-0">
            {etapes.map((e, i) => (
              <Reveal as="li" key={e.t} delay={i * 90}>
                <div className="flex gap-6 border-t border-blanc/14 py-7">
                  <span className="chiffres shrink-0 font-display text-[2.5rem] font-semibold leading-none text-rosso-400">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[1.375rem] font-semibold leading-tight">{e.t}</h3>
                    <p className="mt-1.5 max-w-md text-[0.9375rem] leading-relaxed text-blanc/60">
                      {e.d}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        {vitrine ? (
          <Reveal delay={120} className="relative">
            <div className="relative h-full min-h-[20rem] overflow-hidden rounded-large lg:min-h-[32rem]">
              <Image
                src={vitrine.src}
                alt={vitrine.alt}
                fill
                sizes="(max-width: 1024px) 92vw, 38vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

/* ======================================================= APERÇU DE LA CARTE */

export function ApercuCarte({
  produits,
  categories,
  slugDefaut,
}: {
  produits: HighlightProduct[];
  categories: CategorySummary[];
  slugDefaut: string;
}) {
  const vedettes = produits.slice(0, 3);

  return (
    <section className="mx-auto max-w-[78rem] px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="carte">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="etiquette text-rosso">La carte</p>
          <h2 id="carte" className="mt-3 max-w-[16ch] text-[2.25rem] font-semibold leading-[0.98] sm:text-[3.25rem]">
            Trente-six pizzas, et tout ce qui va avec
          </h2>
        </div>
        <Link href={`/restaurants/${slugDefaut}`} className="b-contour b-l">
          Voir la carte complète
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Reveal>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        {/* Vedettes : la photo fait le travail, aucun cadre autour. */}
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-2">
          {vedettes.map((p, i) => (
            <Reveal
              as="li"
              key={p.id}
              delay={i * 80}
              className={i === 0 ? "col-span-2 sm:col-span-1 lg:col-span-2" : ""}
            >
              <Link href={`/restaurants/${slugDefaut}`} className="group block">
                <div className={`relative overflow-hidden rounded-bloc bg-mur ${i === 0 ? "aspect-[16/10]" : "aspect-square"}`}>
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 90vw, 30vw"
                      className="pose-sur-mur object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                    />
                  ) : null}
                  {p.is_new ? (
                    <span className="pastille absolute left-3 top-3 bg-rosso px-2.5 py-1 text-blanc">
                      Nouveau
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-[1.25rem] font-semibold leading-tight text-encre">
                    {p.name}
                  </h3>
                  <p className="chiffres shrink-0 text-[0.9375rem] font-semibold text-encre">
                    {formatPrice(p.min_price)}
                  </p>
                </div>
                {p.description ? (
                  <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-encre-2">
                    {p.description}
                  </p>
                ) : null}
              </Link>
            </Reveal>
          ))}
        </ul>

        {/* Les catégories : une table typographique, pas une grille de pastilles. */}
        <Reveal delay={100}>
          <p className="etiquette text-encre-3">Tout le reste</p>
          <ul className="mt-4 border-t border-encre/12">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/restaurants/${slugDefaut}#cat-${c.slug}`}
                  className="group flex items-baseline gap-4 border-b border-encre/10 py-3.5 transition-colors hover:border-encre/30"
                >
                  <span className="flex-1 font-display text-[1.125rem] font-medium text-encre transition-transform duration-300 group-hover:translate-x-1">
                    {c.name}
                  </span>
                  <span className="chiffres text-[0.8125rem] text-encre-3">
                    {c.product_count}
                  </span>
                  <span className="chiffres w-[5.75rem] shrink-0 whitespace-nowrap text-right text-[0.875rem] font-semibold text-rosso">
                    dès {formatPrice(c.min_price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ========================================================= ZONES LIVRÉES == */

export function ZonesLivrees({ areas }: { areas: ServedArea[] }) {
  if (!areas.length) return null;

  const groupes = new Map<string, { label: string; note: string | null; codes: Set<string>; depuis: { slug: string; city: string }[] }>();
  for (const a of areas) {
    const cle = a.label.toLowerCase();
    const e = groupes.get(cle) ?? { label: a.label, note: a.note, codes: new Set<string>(), depuis: [] };
    a.postal_codes.forEach((c) => e.codes.add(c));
    if (!e.depuis.some((d) => d.slug === a.restaurant_slug)) {
      e.depuis.push({ slug: a.restaurant_slug, city: a.restaurant_city });
    }
    groupes.set(cle, e);
  }
  const liste = [...groupes.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));

  return (
    <section className="bg-blanc" aria-labelledby="livraison">
      <div className="mx-auto max-w-[78rem] px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
          <Reveal>
            <p className="etiquette text-rosso">Livraison offerte</p>
            <h2 id="livraison" className="mt-3 max-w-[12ch] text-[2.25rem] font-semibold leading-[0.98] sm:text-[3.25rem]">
              {liste.length} communes livrées
            </h2>
            <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-encre-2">
              Aucun frais de livraison, quelle que soit la commune. Si votre
              adresse dépend d&apos;une autre Roma que celle choisie, le site vous
              y oriente automatiquement au moment de commander.
            </p>
            <div className="mt-8 max-w-xs">
              <VerifZone />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {liste.map((z) => (
                <li key={z.label} className="border-b border-encre/10 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-[1.0625rem] font-medium text-encre">
                      {z.label}
                    </span>
                    <span className="chiffres text-[0.75rem] text-encre-3">
                      {[...z.codes].join(" · ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] text-encre-2">
                    {z.note ? <span className="text-encre-3">{z.note} — </span> : null}
                    depuis{" "}
                    {z.depuis.map((d, i) => (
                      <span key={d.slug}>
                        {i > 0 ? " ou " : ""}
                        <Link href={`/restaurants/${d.slug}`} className="font-medium text-rosso underline decoration-rosso/25 underline-offset-2 hover:decoration-rosso">
                          {d.city}
                        </Link>
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ================================================================= FAQ ==== */

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="mx-auto max-w-[78rem] px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="faq">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <Reveal>
          <p className="etiquette text-rosso">Bon à savoir</p>
          <h2 id="faq" className="mt-3 text-[2.25rem] font-semibold leading-[0.98] sm:text-[3rem]">
            Questions fréquentes
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <div className="border-t border-encre/14">
            {items.map((f) => (
              <details key={f.q} className="group border-b border-encre/12">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 marker:content-none">
                  <span className="font-display text-[1.125rem] font-medium leading-snug text-encre sm:text-[1.25rem]">
                    {f.q}
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 grid size-6 shrink-0 place-items-center rounded-full border border-encre/20 text-encre-2 transition-transform duration-300 group-open:rotate-45 group-open:border-rosso group-open:text-rosso"
                  >
                    <svg viewBox="0 0 12 12" className="size-3 fill-none stroke-current stroke-[1.6]">
                      <path d="M6 1.5v9M1.5 6h9" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 pr-10 text-[0.9375rem] leading-relaxed text-encre-2">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
