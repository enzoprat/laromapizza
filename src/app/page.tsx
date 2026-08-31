import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Bike, ShoppingBag, Clock3 } from "lucide-react";
import { listRestaurantCards } from "@/lib/repo/restaurants";
import { getActivePromotions, getCategorySummaries, getHighlights, getServedAreas } from "@/lib/repo/home";
import { RestaurantCard } from "@/components/home/RestaurantCard";
import {
  CategoryGrid, DeliveryAreas, Faq, Highlights, HowItWorks, Promotions, SocialLinks,
} from "@/components/home/HomeSections";
import { Logo } from "@/components/ui/Logo";
import { SITE_URL } from "@/lib/utils";
import { SOCIAL_URLS } from "@/lib/brand";
import { formatPrice } from "@/lib/domain/money";

// Le statut d'ouverture change en continu : on régénère la page chaque minute.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "La Roma Pizza | Pizzeria & livraison à Bordeaux, Bègles et Cenon",
  description:
    "Commandez vos pizzas La Roma en quelques secondes. Click & collect et livraison offerte à Bègles, Bordeaux, Bordeaux Bastide et Cenon. Pizzas 31 et 40 cm, pâtes fraîches, Tex Mex, halal.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "La Roma Pizza — Commandez en quelques secondes",
    description: "4 pizzerias à Bordeaux, Bègles et Cenon. Click & collect et livraison offerte.",
    url: SITE_URL,
    images: [{ url: "/img/food/hero-pizza.jpg", width: 1200, height: 800, alt: "Pizza La Roma" }],
  },
};

export default async function HomePage() {
  const [restaurants, highlights, categories, promotions, areas] = await Promise.all([
    listRestaurantCards(),
    getHighlights(6),
    getCategorySummaries(),
    getActivePromotions(),
    getServedAreas(),
  ]);

  const defaultSlug = restaurants[0]?.slug ?? "begles";
  const lunchMin = Math.min(...restaurants.map((r) => r.delivery_min_lunch));
  const dinnerMin = Math.min(...restaurants.map((r) => r.delivery_min_dinner));
  const cities = [...new Set(areas.map((a) => a.label))];

  const faq = [
    {
      q: "Faut-il créer un compte pour commander ?",
      a: "Non. Vous choisissez vos produits, vous laissez un prénom, un nom et un téléphone, et c'est tout. Aucun mot de passe, aucune inscription.",
    },
    {
      q: "Vos pizzas sont-elles halal ?",
      a: "Oui, toutes nos viandes sont halal. La carte propose aussi des recettes végétariennes, au chèvre, aux quatre fromages ou au saumon.",
    },
    {
      q: "La livraison est-elle payante ?",
      a: `Non, la livraison est offerte sur toutes nos zones. Le minimum de commande est de ${formatPrice(lunchMin)} le midi et de ${formatPrice(dinnerMin)} le soir.`,
    },
    {
      q: "Comment se passe le paiement ?",
      a: "Le paiement se fait au retrait ou à la livraison : espèces, carte bancaire ou titres restaurant. Aucune donnée bancaire ne vous est demandée sur le site.",
    },
    {
      q: "Peut-on commander à l'avance ?",
      a: "Oui. Après avoir choisi entre click & collect et livraison, vous sélectionnez votre créneau parmi les horaires réellement disponibles, jusqu'à deux jours à l'avance.",
    },
    {
      q: "Quelles tailles de pizza proposez-vous ?",
      a: "Deux tailles : 31 cm et 40 cm. Vous pouvez ajouter des suppléments à la carte, facturés 1 € en 31 cm et 1,50 € en 40 cm.",
    },
    {
      q: "Livrez-vous dans ma commune ?",
      a: `Nous livrons notamment ${cities.slice(0, 8).join(", ")}${cities.length > 8 ? " et d'autres communes de la rive droite et du sud de Bordeaux" : ""}. Saisissez votre adresse au moment de commander : le site vérifie immédiatement si elle est desservie.`,
    },
  ];

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "La Roma Pizza",
    url: SITE_URL,
    logo: `${SITE_URL}/img/brand/logo.svg`,
    sameAs: SOCIAL_URLS,
    areaServed: cities.map((c) => ({ "@type": "City", name: c })),
    department: restaurants.map((r) => ({
      "@type": "Restaurant",
      name: r.name,
      url: `${SITE_URL}/restaurants/${r.slug}`,
      telephone: r.phone,
      servesCuisine: ["Pizza", "Italien"],
      address: {
        "@type": "PostalAddress",
        streetAddress: r.street,
        postalCode: r.postal_code,
        addressLocality: r.city,
        addressCountry: "FR",
      },
    })),
  };

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* ------------------------------------------------------------- HERO */}
      <header className="relative overflow-hidden bg-cream">
        <div aria-hidden className="absolute -right-24 -top-24 size-[22rem] rounded-full bg-rosso-100/60 blur-3xl sm:size-[30rem]" />
        <div aria-hidden className="absolute -bottom-32 -left-24 size-[18rem] rounded-full bg-basil-100/70 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12">
          <div className="flex items-center justify-between gap-4">
            <Logo className="h-14 sm:h-16" priority />
            <div className="flex items-center gap-2">
              <span className="chip hidden bg-basil-100 text-basil-700 sm:inline-flex">Halal</span>
              <SocialLinks className="flex gap-2" compact />
            </div>
          </div>

          <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="animate-rise">
              {/* Le H1 porte la marque et les villes — sans sacrifier l'accroche,
                  qui reste la ligne mise en avant visuellement. */}
              <h1 className="font-display tracking-tight text-ink">
                <span className="block text-sm font-bold uppercase tracking-[0.12em] text-rosso-600 sm:text-base">
                  La Roma Pizza — pizzeria à Bordeaux, Bègles et Cenon
                </span>
                <span className="mt-2 block text-[2rem] font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
                  Dans quelle Roma{" "}
                  <span className="text-rosso-600">souhaitez-vous commander&nbsp;?</span>
                </span>
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
                Quatre pizzerias à Bordeaux, Bègles et Cenon. Choisissez la vôtre,
                composez votre commande et récupérez-la sur place ou faites-vous
                livrer — sans créer de compte.
              </p>

              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-soft">
                <li className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-rosso-600" aria-hidden /> Click &amp; collect
                </li>
                <li className="flex items-center gap-2">
                  <Bike className="size-4 text-rosso-600" aria-hidden /> Livraison offerte
                </li>
                <li className="flex items-center gap-2">
                  <Clock3 className="size-4 text-rosso-600" aria-hidden /> 7j/7
                </li>
              </ul>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative aspect-square overflow-hidden rounded-full shadow-lift">
                <Image
                  src="/img/food/pizza-hero.png"
                  alt="Pizza La Roma garnie"
                  fill
                  sizes="(max-width: 1024px) 0px, 40vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------ ÉTABLISSEMENTS */}
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14" aria-labelledby="etablissements">
        <h2 id="etablissements" className="sr-only">Nos établissements</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {restaurants.map((r, i) => (
            <RestaurantCard key={r.id} restaurant={r} index={i} />
          ))}
        </div>
      </section>

      <Promotions promotions={promotions} />
      <HowItWorks />
      <Highlights products={highlights} defaultSlug={defaultSlug} />
      <CategoryGrid categories={categories} defaultSlug={defaultSlug} />
      <DeliveryAreas areas={areas} />
      <Faq items={faq} />

      {/* -------------------------------------------------- PRÉSENTATION SEO */}
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h2 className="font-display text-2xl font-bold text-ink">
          La Roma Pizza, quatre adresses dans la métropole bordelaise
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Nous préparons nos pizzas à la commande, en 31 cm ou 40 cm, avec une viande
          halal. Nos quatre pizzerias couvrent le sud de Bordeaux depuis Bègles, le
          centre depuis le boulevard du Président Wilson, et toute la rive droite
          depuis la Bastide et Cenon. Selon votre adresse, vous pouvez venir récupérer
          votre commande en click &amp; collect ou vous faire livrer gratuitement.
        </p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {restaurants.map((r) => (
            <li key={r.id}>
              <Link
                href={`/restaurants/${r.slug}`}
                className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-rosso-200 hover:bg-rosso-50"
              >
                <span>
                  Pizzeria à {r.city}
                  {r.slug === "bordeaux-bastide" ? " (Bastide)" : ""}
                </span>
                <span className="text-xs text-ink-muted">{r.postal_code}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------------------- PIED DE PAGE */}
      <footer className="border-t border-line bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <Logo className="h-12" />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
                Pizzas préparées à la commande, viande halal, livraison offerte
                sur la métropole bordelaise.
              </p>
              <SocialLinks className="mt-4 flex flex-wrap gap-2" />
            </div>

            <nav aria-label="Nos établissements">
              <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Nos pizzerias</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {restaurants.map((r) => (
                  <li key={r.id}>
                    <Link href={`/restaurants/${r.slug}`} className="text-ink-soft hover:text-ink">
                      {r.city}{r.slug === "bordeaux-bastide" ? " Bastide" : ""}
                      <span className="ml-2 text-xs text-ink-muted">{r.phone}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Informations">
              <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Informations</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li><Link href="/mentions-legales" className="text-ink-soft hover:text-ink">Mentions légales</Link></li>
                <li><Link href="/confidentialite" className="text-ink-soft hover:text-ink">Confidentialité</Link></li>
                <li><Link href="/admin" className="text-ink-soft hover:text-ink">Espace restaurant</Link></li>
              </ul>
            </nav>
          </div>

          <p className="mt-8 border-t border-line pt-6 text-xs text-ink-muted">
            © {new Date().getFullYear()} La Roma Pizza. Photographies non contractuelles.
            Pour votre santé, évitez de grignoter entre les repas —{" "}
            <a href="https://www.mangerbouger.fr" target="_blank" rel="noopener noreferrer" className="underline">
              mangerbouger.fr
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
