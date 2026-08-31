import type { Metadata } from "next";
import { listRestaurantCards } from "@/lib/repo/restaurants";
import { getActivePromotions, getCategorySummaries, getHighlights, getServedAreas } from "@/lib/repo/home";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChoixRoma } from "@/components/home/ChoixRoma";
import { ApercuCarte, BandeauOffres, Faq, Hero, Promesse, ZonesLivrees } from "@/components/home/Sections";
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
    title: "La Roma Pizza — Une faim, quatre Roma",
    description: "4 pizzerias à Bordeaux, Bègles et Cenon. Click & collect et livraison offerte.",
    url: SITE_URL,
    images: [{ url: "/img/food/hero-pizza.jpg", width: 1200, height: 800, alt: "Pizza La Roma" }],
  },
};

export default async function HomePage() {
  const [restaurants, vedettes, categories, promotions, zones] = await Promise.all([
    listRestaurantCards(),
    getHighlights(6),
    getCategorySummaries(),
    getActivePromotions(),
    getServedAreas(),
  ]);

  const slugDefaut = restaurants[0]?.slug ?? "begles";
  const minMidi = Math.min(...restaurants.map((r) => r.delivery_min_lunch));
  const minSoir = Math.min(...restaurants.map((r) => r.delivery_min_dinner));
  const communes = [...new Set(zones.map((z) => z.label))];

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
      a: `Non, la livraison est offerte sur toutes nos zones. Le minimum de commande est de ${formatPrice(minMidi)} le midi et de ${formatPrice(minSoir)} le soir.`,
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
      a: `Nous livrons notamment ${communes.slice(0, 8).join(", ")}${communes.length > 8 ? " et d'autres communes de la rive droite et du sud de Bordeaux" : ""}. Saisissez votre code postal en haut de cette page : la réponse est immédiate.`,
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
    areaServed: communes.map((c) => ({ "@type": "City", name: c })),
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <SiteHeader
        telephone={restaurants[0]?.phone}
        action={{ label: "Commander", href: "#roma" }}
      />

      <main>
        <Hero telephone={restaurants[0]?.phone ?? ""} />
        <ChoixRoma restaurants={restaurants} />
        <BandeauOffres promotions={promotions} />
        <Promesse
          vitrine={{
            src: "/img/brand/four-portrait.webp",
            alt: "Pizzaïolo de La Roma sortant deux pizzas du four",
          }}
        />
        <ApercuCarte produits={vedettes} categories={categories} slugDefaut={slugDefaut} />
        <ZonesLivrees areas={zones} />
        <Faq items={faq} />

        {/* Texte de présentation : utile au référencement local, et pas
            artificiellement gonflé. */}
        <section className="mx-auto max-w-[78rem] px-5 pb-20 sm:px-8">
          <div className="filet max-w-2xl pt-10">
            <h2 className="text-[1.5rem] font-semibold text-encre">
              La Roma Pizza dans la métropole bordelaise
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-encre-2">
              Nos pizzas sont préparées à la commande, en 31 cm ou 40 cm, avec une
              viande halal. Nos quatre pizzerias couvrent le sud de Bordeaux depuis
              Bègles, le centre depuis le boulevard du Président Wilson, et toute la
              rive droite depuis la Bastide et Cenon. Selon votre adresse, vous
              récupérez votre commande en click &amp; collect ou vous vous faites
              livrer gratuitement.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter restaurants={restaurants} />
    </>
  );
}
