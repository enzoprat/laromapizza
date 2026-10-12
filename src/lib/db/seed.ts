import type { Database } from "./index";
import { CATEGORIES, OPTION_GROUPS, EXTRAS, EXTRA_CATEGORIES } from "./seed-data";
import { hashPassword } from "../auth/password";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Données de démarrage.
 *
 * Sources : carte officielle (avril 2026), site laroma-pizza.com et fiches
 * publiques des quatre établissements. Horaires, adresses, téléphones, zones et
 * minimums restent modifiables depuis l'administration : c'est elle qui fait foi
 * une fois le site en ligne.
 */

const RESTAURANTS = [
  {
    slug: "begles",
    name: "La Roma Pizza Bègles",
    city: "Bègles",
    street: "220 boulevard Jean-Jacques Bosc",
    postal_code: "33130",
    phone: "05 33 51 05 47",
    mobile: "06 22 35 54 38",
    photo: "/img/restaurants/begles.jpg",
    neighbourhood: "Boulevard Jean-Jacques Bosc",
    seo_title: "La Roma Pizza Bègles | Pizzeria, livraison & pizza à emporter",
    seo_description:
      "Pizzeria halal à Bègles, boulevard Jean-Jacques Bosc. Pizzas 31 et 40 cm, pâtes fraîches, Tex Mex. Commande en ligne, click & collect et livraison à Bègles, Bordeaux 33800 et Villenave-d'Ornon.",
    seo_intro:
      "Notre pizzeria de Bègles est installée au 220 boulevard Jean-Jacques Bosc, à deux pas du terminus du tram C. Toutes nos pizzas sont préparées à la commande, en 31 cm ou 40 cm, avec une viande halal. Vous pouvez commander en ligne et venir récupérer votre commande sur place, ou vous faire livrer gratuitement à Bègles, sur Bordeaux 33800 et à Villenave-d'Ornon.",
    zones: [
      { label: "Bègles", codes: ["33130"] },
      { label: "Bordeaux Sud (33800)", codes: ["33800"] },
      { label: "Villenave-d'Ornon", codes: ["33140"] },
    ],
  },
  {
    slug: "bordeaux",
    name: "La Roma Pizza Bordeaux",
    city: "Bordeaux",
    street: "84 boulevard du Président Wilson",
    postal_code: "33000",
    phone: "09 81 64 35 06",
    mobile: "07 63 73 25 14",
    photo: "/img/restaurants/bordeaux.jpg",
    neighbourhood: "Boulevard du Président Wilson",
    seo_title: "La Roma Pizza Bordeaux | Pizzeria & livraison boulevard Wilson",
    seo_description:
      "Pizzeria halal à Bordeaux, 84 boulevard du Président Wilson. Pizzas 31 et 40 cm, pâtes fraîches, salades. Commande en ligne, click & collect et livraison sur Bordeaux.",
    seo_intro:
      "Notre établissement bordelais se trouve au 84 boulevard du Président Wilson, entre Saint-Augustin et le Grand Parc. Pizzas cuites à la commande, pâtes fraîches et Tex Mex à emporter en quelques minutes, ou livrés gratuitement dans Bordeaux.",
    zones: [
      { label: "Bordeaux Centre", codes: ["33000"] },
      { label: "Bordeaux La Bastide", codes: ["33100"] },
      { label: "Bordeaux Caudéran", codes: ["33200"] },
      { label: "Bordeaux Chartrons / Grand Parc", codes: ["33300"] },
      { label: "Bordeaux Sud", codes: ["33800"] },
    ],
  },
  {
    slug: "bordeaux-bastide",
    name: "La Roma Pizza Bordeaux Bastide",
    city: "Bordeaux",
    street: "206 rue de la Benauge",
    postal_code: "33100",
    phone: "05 56 32 46 45",
    mobile: "06 62 74 61 62",
    photo: "/img/restaurants/bordeaux-bastide.jpg",
    neighbourhood: "La Bastide — Benauge",
    rating: 3.9,
    rating_count: 209,
    seo_title: "La Roma Pizza Bordeaux Bastide | Pizzeria rue de la Benauge",
    seo_description:
      "Pizzeria halal à Bordeaux La Bastide, 206 rue de la Benauge. Pizzas 31 et 40 cm, pâtes fraîches. Click & collect et livraison à la Bastide, bas Floirac, bas Cenon, bas Lormont et Bouliac.",
    seo_intro:
      "Rive droite, notre pizzeria de la Benauge dessert tout le quartier de la Bastide et le bas des coteaux. Pizzas 31 et 40 cm préparées à la commande, viande halal, et livraison gratuite jusqu'au bas Floirac, bas Cenon, bas Lormont et Bouliac.",
    zones: [
      { label: "Bordeaux La Bastide", codes: ["33100"] },
      { label: "Bas Floirac", codes: ["33270"], note: "Partie basse de la commune" },
      { label: "Bas Cenon", codes: ["33150"], note: "Partie basse de la commune" },
      { label: "Bas Lormont", codes: ["33310"], note: "Partie basse de la commune" },
      { label: "Bouliac", codes: ["33270"] },
    ],
  },
  {
    slug: "cenon",
    name: "La Roma Pizza Cenon",
    city: "Cenon",
    street: "18 avenue René Cassagne",
    postal_code: "33150",
    phone: "05 57 61 24 90",
    mobile: "06 22 35 20 73",
    photo: "/img/restaurants/cenon.jpg",
    neighbourhood: "Avenue René Cassagne",
    seo_title: "La Roma Pizza Cenon | Pizzeria, livraison & pizza à emporter",
    seo_description:
      "Pizzeria halal à Cenon, 18 avenue René Cassagne. Pizzas 31 et 40 cm, pâtes fraîches, Tex Mex. Click & collect et livraison à Cenon, Floirac, Lormont, Artigues, Tresses, Yvrac, Bouliac et Carbon-Blanc.",
    seo_intro:
      "Sur les hauts de Cenon, avenue René Cassagne, nous préparons nos pizzas à la commande en 31 et 40 cm. Récupérez votre commande sur place en click & collect, ou faites-vous livrer gratuitement sur le haut Cenon, Floirac, Lormont, Artigues-près-Bordeaux, Tresses, Yvrac, Bouliac et Carbon-Blanc.",
    zones: [
      { label: "Haut Cenon", codes: ["33150"], note: "Partie haute de la commune" },
      { label: "Floirac", codes: ["33270"] },
      { label: "Lormont", codes: ["33310"] },
      { label: "Artigues-près-Bordeaux", codes: ["33370"] },
      { label: "Tresses", codes: ["33370"] },
      { label: "Yvrac", codes: ["33370"] },
      { label: "Bouliac", codes: ["33270"] },
      { label: "Carbon-Blanc", codes: ["33560"] },
    ],
  },
];

/** Lundi→Samedi : 11h-14h et 18h-23h. Dimanche : 18h-23h. */
const HOURS: { weekday: number; opens: string; closes: string; service: "midi" | "soir" }[] = [
  ...[0, 1, 2, 3, 4, 5].flatMap((weekday) => [
    { weekday, opens: "11:00", closes: "14:00", service: "midi" as const },
    { weekday, opens: "18:00", closes: "23:00", service: "soir" as const },
  ]),
  { weekday: 6, opens: "18:00", closes: "23:00", service: "soir" as const },
];

/** Normalise une commune pour la comparaison : minuscules, sans accents ni tirets. */
export function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(bas|haut)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Photo d'un produit, déduite de son identifiant.
 *
 * Déposer `public/img/food/produits/<slug>.webp` suffit à l'associer : pas de
 * chemin à recopier dans les données, et une nouvelle photo est prise en compte
 * sans toucher au code.
 */
function photoFor(slug: string): string | null {
  const relative = `/img/food/produits/${slug}.webp`;
  return existsSync(path.join(process.cwd(), "public", relative)) ? relative : null;
}

export async function seed(db: Database) {
  const q = db.query.bind(db);

  // ------------------------------------------------------------- RESTAURANTS
  const restaurantIds: Record<string, number> = {};
  for (const [i, r] of RESTAURANTS.entries()) {
    const [row] = await q<{ id: number }>(
      `INSERT INTO restaurants
         (slug,name,city,street,postal_code,phone,mobile,photo,neighbourhood,
          seo_title,seo_description,seo_intro,rating,rating_count,position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [r.slug, r.name, r.city, r.street, r.postal_code, r.phone, r.mobile, r.photo,
       r.neighbourhood, r.seo_title, r.seo_description, r.seo_intro,
       ("rating" in r ? r.rating : null) ?? null,
       ("rating_count" in r ? r.rating_count : null) ?? null, i],
    );
    restaurantIds[r.slug] = row.id;

    for (const h of HOURS) {
      await q(
        `INSERT INTO restaurant_hours (restaurant_id,weekday,opens_at,closes_at,service)
         VALUES ($1,$2,$3,$4,$5)`,
        [row.id, h.weekday, h.opens, h.closes, h.service],
      );
    }
    for (const z of r.zones) {
      await q(
        `INSERT INTO delivery_zones (restaurant_id,label,city_match,postal_codes,note)
         VALUES ($1,$2,$3,$4,$5)`,
        [row.id, z.label, normalizeCity(z.label), z.codes, ("note" in z ? z.note : null) ?? null],
      );
    }
  }

  // --------------------------------------------------------------- CATALOGUE
  const categoryIds: Record<string, number> = {};
  const productIds: Record<string, number> = {};
  const productsByCategory: Record<string, string[]> = {};
  // slug produit -> { nom, variantes } pour construire les groupes de choix
  const productMeta: Record<string, { name: string; variants: { size?: string; price: number }[] }> = {};

  for (const [ci, cat] of CATEGORIES.entries()) {
    const [crow] = await q<{ id: number }>(
      `INSERT INTO categories (slug,name,description,icon,position)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [cat.slug, cat.name, cat.description ?? null, cat.icon ?? null, ci],
    );
    categoryIds[cat.slug] = crow.id;
    productsByCategory[cat.slug] = [];

    for (const [pi, p] of cat.products.entries()) {
      const [prow] = await q<{ id: number }>(
        `INSERT INTO products
           (category_id,slug,name,description,image,is_new,is_popular,is_vegetarian,
            kind,evening_surcharge,availability,position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [crow.id, p.slug, p.name, p.description ?? null, p.image ?? photoFor(p.slug),
         p.isNew ?? false, p.popular ?? false, p.veg ?? false,
         p.kind ?? "simple", p.eveningSurcharge ?? 0, p.availability ?? "all", pi],
      );
      productIds[p.slug] = prow.id;
      productsByCategory[cat.slug].push(p.slug);
      productMeta[p.slug] = { name: p.name, variants: p.variants.map((v) => ({ size: v.size, price: v.price })) };

      for (const [vi, v] of p.variants.entries()) {
        await q(
          `INSERT INTO product_variants (product_id,name,short_name,price,size_code,position,is_default)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [prow.id, v.name, v.short ?? null, v.price, v.size ?? null, vi, v.default ?? false],
        );
      }
    }
  }

  // ------------------------------------------------------- GROUPES D'OPTIONS
  const groupIds: Record<string, number> = {};
  for (const [gi, g] of OPTION_GROUPS.entries()) {
    const [grow] = await q<{ id: number }>(
      `INSERT INTO option_groups (slug,name,min_select,max_select,position)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [g.slug, g.name, g.min, g.max, gi],
    );
    groupIds[g.slug] = grow.id;

    let options: { name: string; delta: number; def: boolean }[] = [];
    if (g.options) {
      options = g.options.map((o) => ({ name: o.name, delta: o.delta ?? 0, def: o.default ?? false }));
    } else if (g.fromCategories) {
      // Les choix d'une formule sont les produits des catégories visées.
      // Supplément à 0 € : c'est le prix affiché sur la carte. Chaque écart
      // tarifaire (ex. « +2 € pour une Cannibale ») se règle dans l'admin.
      const slugs = g.fromCategories.flatMap((c) => productsByCategory[c] ?? []);
      options = slugs
        .filter((s) => !g.variantSize || productMeta[s].variants.some((v) => v.size === g.variantSize))
        .map((s, idx) => ({ name: productMeta[s].name, delta: 0, def: idx === 0 }));
    }

    for (const [oi, o] of options.entries()) {
      await q(
        `INSERT INTO product_options (group_id,name,price_delta,position,is_default)
         VALUES ($1,$2,$3,$4,$5)`,
        [grow.id, o.name, o.delta, oi, o.def],
      );
    }
  }

  for (const cat of CATEGORIES) {
    for (const p of cat.products) {
      for (const [i, gslug] of (p.optionGroups ?? []).entries()) {
        const gid = groupIds[gslug];
        if (!gid) continue;
        const grp = OPTION_GROUPS.find((g) => g.slug === gslug);
        await q(
          `INSERT INTO product_option_groups (product_id,group_id,is_required,position)
           VALUES ($1,$2,$3,$4)`,
          [productIds[p.slug], gid, (grp?.min ?? 0) > 0, i],
        );
      }
    }
  }

  // ------------------------------------------------------------- SUPPLÉMENTS
  const priceBySize = JSON.stringify({ "31": 100, "40": 150 });
  for (const [i, e] of EXTRAS.entries()) {
    const [erow] = await q<{ id: number }>(
      `INSERT INTO product_extras (slug,name,category,price_by_size,price_default,position)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6) RETURNING id`,
      [e.slug, e.name, e.category, priceBySize, 100, i],
    );
    for (const c of EXTRA_CATEGORIES) {
      await q(`INSERT INTO category_extras (category_id,extra_id) VALUES ($1,$2)`, [categoryIds[c], erow.id]);
    }
  }

  // -------------------------------------------------------------- PROMOTIONS
  const pizzaCategoryIds = EXTRA_CATEGORIES.map((c) => categoryIds[c]);
  const allRestaurantIds = Object.values(restaurantIds);

  const promos = [
    {
      code: "EMPORTER-1-1",
      name: "1 pizza achetée = 1 offerte",
      description: "Sur toutes nos pizzas, uniquement à emporter. La pizza offerte est la moins chère.",
      kind: "buy_x_get_y", buy: 1, free: 1, value: 0,
      order_types: ["pickup"], priority: 10, active: true,
    },
    {
      code: "LIVRAISON-2-1",
      name: "2 pizzas achetées = 1 offerte",
      description: "Sur toutes nos pizzas, uniquement en livraison. La pizza offerte est la moins chère.",
      kind: "buy_x_get_y", buy: 2, free: 1, value: 0,
      order_types: ["delivery"], priority: 10, active: true,
    },
    // Offres « bundle » de la carte : à activer par le Super Admin une fois le
    // périmètre exact des pizzas concernées confirmé.
    {
      code: "LIVRAISON-2x31-20",
      name: "2 pizzas 31 cm = 20 €",
      description: "Offre livraison sur deux pizzas 31 cm.",
      kind: "bundle_price", buy: 2, free: 0, value: 2000,
      order_types: ["delivery"], sizes: ["31"], priority: 5, active: false,
    },
    {
      code: "LIVRAISON-2x40-30",
      name: "2 pizzas 40 cm = 30 €",
      description: "Offre livraison sur deux pizzas 40 cm.",
      kind: "bundle_price", buy: 2, free: 0, value: 3000,
      order_types: ["delivery"], sizes: ["40"], priority: 5, active: false,
    },
  ] as const;

  for (const p of promos) {
    const [prow] = await q<{ id: number }>(
      `INSERT INTO promotions
         (code,name,description,kind,buy_quantity,free_quantity,discount_value,
          order_types,category_ids,size_codes,priority,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [p.code, p.name, p.description, p.kind, p.buy, p.free, p.value,
       p.order_types, pizzaCategoryIds, "sizes" in p ? p.sizes : [], p.priority, p.active],
    );
    for (const rid of allRestaurantIds) {
      await q(`INSERT INTO promotion_restaurants (promotion_id,restaurant_id) VALUES ($1,$2)`, [prow.id, rid]);
    }
  }

  // ------------------------------------------------------------------ ADMINS
  /**
   * Aucun mot de passe par défaut dans le code : ce dépôt est public, et une
   * valeur en dur ouvrirait l'administration des quatre établissements à qui
   * la lit. À défaut de SEED_ADMIN_PASSWORD, on en tire un au hasard et on
   * l'affiche une fois dans la console du serveur.
   */
  const fourni = process.env.SEED_ADMIN_PASSWORD?.trim();
  const motDePasse = fourni || randomBytes(9).toString("base64url");
  if (!fourni) {
    console.warn(
      `\n  ─────────────────────────────────────────────────────────────\n` +
      `  Comptes administrateur créés.\n` +
      `  Identifiant : super@laroma-pizza.com\n` +
      `  Mot de passe : ${motDePasse}\n` +
      `  (généré aléatoirement — définissez SEED_ADMIN_PASSWORD pour le choisir)\n` +
      `  ─────────────────────────────────────────────────────────────\n`,
    );
  }
  const hash = await hashPassword(motDePasse);
  await q(
    `INSERT INTO admins (email,name,password_hash,role,restaurant_id) VALUES ($1,$2,$3,$4,$5)`,
    ["super@laroma-pizza.com", "Direction La Roma", hash, "super_admin", null],
  );
  for (const r of RESTAURANTS) {
    await q(
      `INSERT INTO admins (email,name,password_hash,role,restaurant_id) VALUES ($1,$2,$3,$4,$5)`,
      [`${r.slug}@laroma-pizza.com`, `Responsable ${r.city}${r.slug === "bordeaux-bastide" ? " Bastide" : ""}`,
       hash, "restaurant_admin", restaurantIds[r.slug]],
    );
  }

  await q(`INSERT INTO counters (name,value) VALUES ('order_number', 1041)`);
}
