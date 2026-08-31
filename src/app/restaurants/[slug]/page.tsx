import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantBySlug, getStatusFor, getZones, listRestaurants } from "@/lib/repo/restaurants";
import { getMenu } from "@/lib/repo/menu";
import { RestaurantHeader } from "@/components/site/RestaurantHeader";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { SITE_URL } from "@/lib/utils";
import { priceForSchema } from "@/lib/domain/money";
import { dayNameCapitalized } from "@/lib/domain/time";

export const revalidate = 60;

export async function generateStaticParams() {
  const restaurants = await listRestaurants();
  return restaurants.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};

  const title = restaurant.seo_title ?? `${restaurant.name} | Pizzeria & livraison`;
  const description =
    restaurant.seo_description ??
    `Commandez vos pizzas chez ${restaurant.name}, ${restaurant.street}, ${restaurant.postal_code} ${restaurant.city}.`;

  return {
    title,
    description,
    alternates: { canonical: `/restaurants/${restaurant.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/restaurants/${restaurant.slug}`,
      type: "website",
      images: restaurant.photo ? [{ url: restaurant.photo, alt: restaurant.name }] : undefined,
    },
  };
}

const SCHEMA_DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant || !restaurant.is_active) notFound();

  const [{ status, hours }, menu, zones, all] = await Promise.all([
    getStatusFor(restaurant.id),
    getMenu(restaurant.id),
    getZones(restaurant.id),
    listRestaurants(),
  ]);

  const others = all.filter((r) => r.id !== restaurant.id);
  const zoneLabels = zones.map((z) => z.label);

  // -------------------------------------------------------------- JSON-LD
  const restaurantJsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_URL}/restaurants/${restaurant.slug}#restaurant`,
    name: restaurant.name,
    url: `${SITE_URL}/restaurants/${restaurant.slug}`,
    image: restaurant.photo ? `${SITE_URL}${restaurant.photo}` : undefined,
    telephone: restaurant.phone,
    priceRange: "€",
    servesCuisine: ["Pizza", "Italien"],
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.street,
      postalCode: restaurant.postal_code,
      addressLocality: restaurant.city,
      addressRegion: "Nouvelle-Aquitaine",
      addressCountry: "FR",
    },
    openingHoursSpecification: hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${SCHEMA_DAYS[h.weekday]}`,
      opens: h.opens_at,
      closes: h.closes_at,
    })),
    ...(restaurant.rating && restaurant.rating_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(restaurant.rating),
            reviewCount: restaurant.rating_count,
          },
        }
      : {}),
    hasMenu: {
      "@type": "Menu",
      name: `Carte ${restaurant.name}`,
      hasMenuSection: menu.categories.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: c.products.map((p) => ({
          "@type": "MenuItem",
          name: p.name,
          description: p.description ?? undefined,
          offers: p.variants.map((v) => ({
            "@type": "Offer",
            name: p.variants.length > 1 ? v.name : undefined,
            price: priceForSchema(v.price),
            priceCurrency: "EUR",
            availability: p.out_of_stock
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          })),
        })),
      })),
    },
    ...(restaurant.delivery_enabled
      ? {
          areaServed: zones.map((z) => ({ "@type": "City", name: z.label })),
          hasDeliveryMethod: "https://schema.org/OnSitePickup",
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: restaurant.name,
        item: `${SITE_URL}/restaurants/${restaurant.slug}`,
      },
    ],
  };

  const faq = buildFaq(restaurant, zoneLabels, hours);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="min-h-dvh bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <nav aria-label="Fil d'Ariane" className="sr-only">
        <ol>
          <li><Link href="/">Accueil</Link></li>
          <li>{restaurant.name}</li>
        </ol>
      </nav>

      <RestaurantHeader restaurant={restaurant} status={status} />

      {!restaurant.accepting_orders ? (
        <p className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
          <span className="block rounded-xl bg-rosso-50 px-4 py-3 text-sm font-medium text-rosso-700">
            Ce restaurant ne prend pas de nouvelle commande en ligne pour le moment.
            Vous pouvez l&apos;appeler au {restaurant.phone}.
          </span>
        </p>
      ) : null}

      <MenuBrowser
        categories={menu.categories}
        restaurant={{
          id: restaurant.id,
          slug: restaurant.slug,
          name: restaurant.name,
          city: restaurant.city,
        }}
      />

      {/* --------------------------------------------------- CONTENU LOCAL */}
      <section className="border-t border-line bg-cream">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-ink">
            Pizza à {restaurant.city}
            {restaurant.slug === "bordeaux-bastide" ? " — quartier de la Bastide" : ""}
          </h2>
          {restaurant.seo_intro ? (
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{restaurant.seo_intro}</p>
          ) : null}

          {restaurant.delivery_enabled && zoneLabels.length ? (
            <>
              <h3 className="mt-8 font-display text-lg font-bold text-ink">Zones de livraison</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {zones.map((z) => (
                  <li key={z.id} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-ink-soft">
                    {z.label}
                    {z.note ? <span className="text-ink-muted"> · {z.note}</span> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h3 className="mt-8 font-display text-lg font-bold text-ink">Horaires</h3>
          <table className="mt-3 w-full max-w-sm text-sm">
            <tbody>
              {[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
                const ranges = hours.filter((h) => h.weekday === weekday);
                return (
                  <tr key={weekday} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 text-left font-medium text-ink">
                      {dayNameCapitalized(weekday)}
                    </th>
                    <td className="py-2 text-right text-ink-soft">
                      {ranges.length
                        ? ranges.map((r) => `${r.opens_at} – ${r.closes_at}`).join(" · ")
                        : "Fermé"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3 className="mt-10 font-display text-lg font-bold text-ink">Questions fréquentes</h3>
          <div className="mt-3 space-y-2">
            {faq.map((f) => (
              <details key={f.q} className="group rounded-xl border border-line bg-white px-4 py-3">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink marker:content-none">
                  <span className="flex items-center justify-between gap-3">
                    {f.q}
                    <span aria-hidden className="text-rosso-600 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>

          <h3 className="mt-10 font-display text-lg font-bold text-ink">Nos autres pizzerias</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {others.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/restaurants/${r.slug}`}
                  className="block rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-rosso-200 hover:bg-rosso-50"
                >
                  {r.city}
                  {r.slug === "bordeaux-bastide" ? " Bastide" : ""}
                  <span className="mt-0.5 block text-xs font-normal text-ink-muted">{r.street}</span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-10 text-xs text-ink-muted">
            <Link href="/mentions-legales" className="underline hover:text-ink">Mentions légales</Link>
            {" · "}
            <Link href="/confidentialite" className="underline hover:text-ink">Confidentialité</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

/** FAQ construite à partir des vraies données de l'établissement. */
function buildFaq(
  restaurant: Awaited<ReturnType<typeof getRestaurantBySlug>> & object,
  zones: string[],
  hours: { weekday: number; opens_at: string; closes_at: string }[],
) {
  const weekday = hours.filter((h) => h.weekday === 0);
  const sunday = hours.filter((h) => h.weekday === 6);
  const lunch = hours.find((h) => Number(h.opens_at.slice(0, 2)) < 15);
  const min = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

  const faq: { q: string; a: string }[] = [
    {
      q: `Quels sont les horaires de La Roma Pizza ${restaurant.city} ?`,
      a: `Du lundi au samedi : ${weekday.map((h) => `${h.opens_at} – ${h.closes_at}`).join(" et ")}. Le dimanche : ${
        sunday.length ? sunday.map((h) => `${h.opens_at} – ${h.closes_at}`).join(" et ") : "fermé"
      }.`,
    },
    {
      q: "Peut-on commander une pizza à emporter ?",
      a: `Oui. Vous commandez en ligne, vous choisissez votre heure de retrait, et vous récupérez votre commande au ${restaurant.street}, ${restaurant.postal_code} ${restaurant.city}. Le paiement se fait sur place.`,
    },
  ];

  if (zones.length) {
    faq.push({
      q: `Livrez-vous à ${zones[Math.min(1, zones.length - 1)]} ?`,
      a: `Nous livrons ${zones.slice(0, -1).join(", ")}${zones.length > 1 ? " et " : ""}${zones[zones.length - 1]}. Si votre adresse ne fait pas partie de ces communes, nous vous proposons automatiquement l'établissement La Roma le plus proche.`,
    });
  }

  if (lunch) {
    faq.push({
      q: "La livraison est-elle disponible le midi ?",
      a: `Oui, dès ${lunch.opens_at}. Le minimum de commande est de ${min(restaurant.delivery_min_lunch)} le midi et de ${min(restaurant.delivery_min_dinner)} le soir. La livraison est gratuite.`,
    });
  }

  faq.push({
    q: "Vos pizzas sont-elles halal ?",
    a: "Oui, toutes nos viandes sont halal. La carte propose également des pizzas végétariennes et des recettes à la mozzarella, au chèvre ou au saumon.",
  });

  return faq;
}
