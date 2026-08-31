/**
 * Catalogue La Roma Pizza — transcription structurée de la carte (avril 2026).
 * Montants en CENTIMES. Ce fichier ne sert qu'à l'amorçage : une fois la base
 * créée, tout se modifie depuis l'administration.
 */

export type SeedVariant = { name: string; short?: string; price: number; size?: string; default?: boolean };
export type SeedProduct = {
  slug: string;
  name: string;
  description?: string;
  variants: SeedVariant[];
  isNew?: boolean;
  popular?: boolean;
  veg?: boolean;
  kind?: "simple" | "pizza" | "menu";
  image?: string;
  eveningSurcharge?: number;
  availability?: "all" | "pickup" | "delivery";
  optionGroups?: string[];
};
export type SeedCategory = {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  products: SeedProduct[];
};

const PIZZA = (slug: string, name: string, description: string, p31: number, p40: number, extra: Partial<SeedProduct> = {}): SeedProduct => ({
  slug,
  name,
  description,
  kind: "pizza",
  variants: [
    { name: "31 cm", short: "31", price: p31, size: "31", default: true },
    { name: "40 cm", short: "40", price: p40, size: "40" },
  ],
  ...extra,
});

const ONE = (slug: string, name: string, price: number, description?: string, extra: Partial<SeedProduct> = {}): SeedProduct => ({
  slug,
  name,
  description,
  variants: [{ name: "Unité", price, default: true }],
  ...extra,
});

export const CATEGORIES: SeedCategory[] = [
  // ------------------------------------------------------------------- MENUS
  {
    slug: "menus",
    name: "Menus",
    description: "Nos formules complètes, le meilleur rapport qualité-prix.",
    icon: "menu",
    products: [
      {
        slug: "menu-solo", name: "Menu Solo", kind: "menu", popular: true,
        description: "1 pizza 31 cm + 1 dessert ou 1 glace (100 ml) + 1 boisson 33 cl",
        variants: [{ name: "Formule", price: 1690, default: true }],
        optionGroups: ["choix-pizza-31", "choix-dessert-glace", "choix-boisson-33"],
      },
      {
        slug: "menu-duo", name: "Menu Duo", kind: "menu", popular: true,
        description: "2 pizzas 31 cm + 1 boisson 1,5 L + 2 desserts ou 2 glaces (100 ml) ou 1 entrée",
        variants: [{ name: "Formule", price: 2700, default: true }],
        optionGroups: ["choix-pizza-31", "choix-boisson-grande"],
      },
      {
        slug: "menu-family", name: "Menu Family", kind: "menu",
        description: "2 entrées + 2 pizzas 40 cm + 1 boisson 1,5 L",
        variants: [{ name: "Formule", price: 3900, default: true }],
        optionGroups: ["choix-pizza-40", "choix-entree", "choix-boisson-grande"],
      },
      {
        slug: "menu-malin", name: "Menu Malin", kind: "menu",
        description: "1 entrée + 1 pizza 40 cm + 1 boisson 1,5 L",
        variants: [{ name: "Formule", price: 2600, default: true }],
        optionGroups: ["choix-pizza-40", "choix-entree", "choix-boisson-grande"],
      },
      {
        slug: "menu-pizza-31", name: "Menu Pizza 31 cm", kind: "menu",
        description: "1 pizza 31 cm + 1 boisson 33 cl",
        variants: [{ name: "Formule", price: 1090, default: true }],
        optionGroups: ["choix-pizza-31", "choix-boisson-33"],
      },
      {
        slug: "menu-pizza-40", name: "Menu Pizza 40 cm", kind: "menu",
        description: "1 pizza 40 cm",
        variants: [{ name: "Formule", price: 1600, default: true }],
        optionGroups: ["choix-pizza-40"],
      },
      {
        slug: "menu-tex-mex", name: "Menu Tex Mex", kind: "menu", availability: "pickup",
        description: "1 Tex Mex avec potatoes + 1 dessert + 1 boisson 33 cl",
        variants: [{ name: "Formule", price: 990, default: true }],
        optionGroups: ["choix-tex-mex", "choix-dessert", "choix-boisson-33"],
      },
      {
        slug: "menu-salade", name: "Menu Salade", kind: "menu", availability: "pickup", eveningSurcharge: 100,
        description: "1 salade + 1 dessert + 1 boisson 33 cl",
        variants: [{ name: "Formule", price: 990, default: true }],
        optionGroups: ["choix-salade", "choix-dessert", "choix-boisson-33"],
      },
      {
        slug: "menu-pates", name: "Menu Pâtes", kind: "menu", eveningSurcharge: 100,
        description: "1 plat de pâtes + 1 dessert + 1 boisson 33 cl",
        variants: [
          { name: "Taille L", short: "L", price: 990, size: "L", default: true },
          { name: "Taille XL", short: "XL", price: 1290, size: "XL" },
        ],
        optionGroups: ["choix-pates", "choix-dessert", "choix-boisson-33"],
      },
      {
        slug: "menu-enfant", name: "Menu Enfant", kind: "menu",
        description: "1 pizza jambon fromage ou 4 nuggets & potatoes + 1 compote + 1 Capri-Sun",
        variants: [{ name: "Formule", price: 590, default: true }],
        optionGroups: ["choix-enfant"],
      },
      {
        slug: "formule-midi-livraison", name: "Formule Midi", kind: "menu", availability: "delivery",
        description: "1 pizza moyenne + 1 boisson 33 cl — en livraison, le midi uniquement",
        variants: [{ name: "Formule", price: 990, default: true }],
        optionGroups: ["choix-pizza-31", "choix-boisson-33"],
      },
    ],
  },

  // ------------------------------------------------------------------ PIZZAS
  {
    slug: "pizzas-classiques", name: "Classiques", icon: "pizza",
    description: "Les incontournables de la maison.",
    products: [
      PIZZA("margarita", "Margarita", "Tomate, mozzarella, olives", 1300, 1700, { veg: true }),
      PIZZA("regina", "Regina", "Tomate, mozzarella, jambon, champignons, olives", 1400, 1800),
      PIZZA("calzone", "Calzone", "Tomate, mozzarella, jambon, champignons, œuf", 1400, 1800),
      PIZZA("chorizo", "Chorizo", "Tomate, mozzarella, chorizo, poivrons, olives", 1400, 1800),
      PIZZA("bolognaise", "Bolognaise", "Tomate, mozzarella, viande hachée, poivrons, persillade, olives", 1400, 1800),
      PIZZA("merguez", "Merguez", "Tomate, mozzarella, merguez, poivrons, olives", 1400, 1800),
    ],
  },
  {
    slug: "pizzas-viandes", name: "Viandes", icon: "beef",
    description: "Généreuses, pour les gros appétits.",
    products: [
      PIZZA("roma", "Roma", "Tomate, mozzarella, viande hachée, poulet, oignons, poivrons, crème fraîche, olives, persillade", 1600, 2000, { popular: true }),
      PIZZA("royale", "Royale", "Tomate, mozzarella, viande hachée, jambon, chorizo, oignons, poivrons, champignons, olives", 1700, 2100),
      PIZZA("chicken", "Chicken", "Tomate, mozzarella, poulet mariné, poivrons, oignons, crème fraîche", 1500, 1900, { popular: true }),
      PIZZA("hawaienne", "Hawaïenne", "Tomate, poulet, ananas, crème fraîche, mozzarella", 1500, 1900),
      PIZZA("venise", "Venise", "Tomate, mozzarella, lardons, reblochon, crème fraîche, oignons, champignons, olives", 1700, 2100),
      PIZZA("magret", "Magret", "Tomate, mozzarella, champignons, persillade, magret de canard, crème fraîche", 1700, 2100),
      PIZZA("magret-chevre", "Magret Chèvre", "Tomate, mozzarella, champignons, persillade, magret de canard, chèvre, crème fraîche", 1800, 2200),
      PIZZA("napolitaine", "Napolitaine", "Tomate, mozzarella, chorizo, lardons, crème fraîche, poivrons, oignons, champignons", 1700, 2100),
      PIZZA("milanaise", "Milanaise", "Crème fraîche, ail, fines herbes, poulet, pommes de terre, oignons", 1600, 2000),
      PIZZA("palerme", "Palerme", "Tomate, mozzarella, jambon, chorizo, lardons, crème fraîche, oignons", 1600, 2000),
      PIZZA("marsala", "Marsala", "Tomate, mozzarella, kebab, merguez, poivrons, persillade, olives", 1600, 2000),
      PIZZA("texmex", "Tex Mex", "Tomate, goujons de poulet, potatoes, poivrons, cheddar, persillade, mozzarella, olives", 1700, 2100),
      PIZZA("forestiere", "Forestière", "Crème fraîche, poulet, fromage, lardons, oignons, champignons", 1700, 2100),
      PIZZA("kebab", "Kebab", "Crème fraîche, kebab, oignons, olives", 1700, 2100, { isNew: true }),
    ],
  },
  {
    slug: "pizzas-fromages", name: "Fromages", icon: "cheese",
    description: "Pour les amateurs de fromage.",
    products: [
      PIZZA("4-fromages", "4 Fromages", "Tomate, mozzarella, roquefort, chèvre, emmental, origan", 1500, 1900, { veg: true }),
      PIZZA("3-fromages", "3 Fromages", "Tomate, mozzarella, chèvre, emmental, origan", 1400, 1800, { veg: true }),
      PIZZA("chevre-miel", "Chèvre Miel", "Crème fraîche, mozzarella, chèvre, jambon, miel", 1600, 2000),
      PIZZA("raclette", "Raclette", "Crème fraîche, mozzarella, jambon, raclette, pommes de terre, oignons", 1600, 2000),
      PIZZA("tartiflette", "Tartiflette", "Crème fraîche, mozzarella, oignons, pommes de terre, lardons, tartiflette", 1600, 2000),
      PIZZA("poulet-miel", "Poulet Miel", "Crème fraîche, poulet, chèvre, miel", 1600, 2000, { isNew: true }),
    ],
  },
  {
    slug: "pizzas-veggies", name: "Veggies", icon: "leaf",
    description: "100 % végétarien.",
    products: [
      PIZZA("provencale", "Provençale", "Tomate, mozzarella, champignons, oignons, tomates fraîches, poivrons, persillade, olives", 1500, 1900, { veg: true }),
      PIZZA("4-saisons", "4 Saisons", "Tomate, mozzarella, champignons, oignons, courgettes, aubergines, tomates cerises, olives, persillade", 1500, 1900, { veg: true }),
      PIZZA("veggie-chevre", "Veggie Chèvre", "Crème fraîche, mozzarella, chèvre, miel", 1600, 2000, { veg: true }),
    ],
  },
  {
    slug: "pizzas-speciales", name: "Spéciales Roma", icon: "star",
    description: "Nos créations signature. Base au choix : crème fraîche ou sauce tomate.",
    products: [
      PIZZA("base-curry", "Base Curry", "Poulet, mozzarella, oignons, poivrons", 1700, 2100, { optionGroups: ["base-pizza"] }),
      PIZZA("base-barbecue", "Base Barbecue", "Viande hachée, mozzarella, oignons, poivrons, olives", 1700, 2100, { optionGroups: ["base-pizza"] }),
      PIZZA("base-burger", "Base Burger", "Viande hachée, oignons, poivrons, cheddar", 1700, 2100, { optionGroups: ["base-pizza"] }),
      PIZZA("cannibale", "Cannibale", "Base barbecue, mozzarella, poulet, viande hachée, merguez", 1800, 2200, { optionGroups: ["base-pizza"] }),
    ],
  },
  {
    slug: "pizzas-oceanes", name: "Océanes", icon: "fish",
    description: "Le meilleur de la mer.",
    products: [
      PIZZA("saumon", "Saumon", "Crème fraîche, mozzarella, double saumon fumé, oignons, persillade, citron", 1600, 2000),
      PIZZA("fruits-de-mer", "Fruits de Mer", "Tomate, mozzarella, cocktail de fruits de mer, olives, persillade", 1600, 2000),
      PIZZA("thon", "Thon", "Tomate, mozzarella, thon, crème fraîche, oignons, persillade, citron", 1600, 2000),
      PIZZA("duo-de-la-mer", "Duo de la Mer", "Tomate, mozzarella, thon, saumon fumé, oignons, crème fraîche, citron", 1600, 2000),
      PIZZA("anchois", "Anchois", "Tomate, mozzarella, anchois, oignons, olives", 1600, 2000),
    ],
  },

  // -------------------------------------------------------------------- PÂTES
  {
    slug: "pates", name: "Pâtes fraîches", icon: "wheat",
    description: "Préparées à la commande.",
    products: [
      { slug: "tagliatelles-magret", name: "Tagliatelles Magret", isNew: true, description: "Magret, crème, champignons, persillade, emmental", variants: [{ name: "Taille L", short: "L", price: 990, size: "L", default: true }] },
      { slug: "tagliatelles-saumon", name: "Tagliatelles Saumon", isNew: true, description: "Saumon, crème, tomate cerise, emmental, ciboulette", variants: [{ name: "Taille L", short: "L", price: 990, size: "L", default: true }] },
      { slug: "tagliatelles-crevette", name: "Tagliatelles Crevette", isNew: true, description: "Crevette, crème, tomate cerise, emmental, persillade", variants: [{ name: "Taille L", short: "L", price: 990, size: "L", default: true }] },
      { slug: "pates-poulet-curry", name: "Poulet Curry", description: "Crème, émincé de poulet, sauce curry, emmental", variants: [{ name: "Taille L", short: "L", price: 790, size: "L", default: true }, { name: "Taille XL", short: "XL", price: 990, size: "XL" }] },
      { slug: "pates-carbonara", name: "Carbonara", description: "Crème, lardons, emmental, ciboulette", popular: true, variants: [{ name: "Taille L", short: "L", price: 790, size: "L", default: true }, { name: "Taille XL", short: "XL", price: 990, size: "XL" }] },
      { slug: "pates-saumon", name: "Saumon", description: "Crème, saumon, ciboulette, emmental", variants: [{ name: "Taille L", short: "L", price: 790, size: "L", default: true }, { name: "Taille XL", short: "XL", price: 990, size: "XL" }] },
      { slug: "pates-forestiere", name: "Forestière", description: "Crème, émincé de poulet, champignons, emmental, ciboulette", variants: [{ name: "Taille L", short: "L", price: 790, size: "L", default: true }, { name: "Taille XL", short: "XL", price: 990, size: "XL" }] },
      { slug: "pates-4-fromages", name: "4 Fromages", description: "Crème, chèvre, mozzarella, emmental, bleu", veg: true, variants: [{ name: "Taille L", short: "L", price: 790, size: "L", default: true }, { name: "Taille XL", short: "XL", price: 990, size: "XL" }] },
    ],
  },

  // ------------------------------------------------------------------ TEX MEX
  {
    slug: "tex-mex", name: "Tex Mex", icon: "drumstick",
    description: "Tous nos Tex Mex sont accompagnés d'une sauce barbecue.",
    products: [
      ONE("nuggets", "Nuggets x8", 590, "8 nuggets de poulet, sauce barbecue", { popular: true }),
      ONE("chicken-wings", "Chicken Wings x6", 590, "6 ailes de poulet marinées, sauce barbecue"),
      ONE("goujons-poulet", "Goujons de poulet x5", 590, "5 goujons de poulet, sauce barbecue"),
      ONE("potatoes-cheddar", "Potatoes Cheddar", 390, "Potatoes gratinées au cheddar", { isNew: true }),
      ONE("potatoes-cheddar-lardons", "Potatoes Cheddar & Lardons", 490, "Potatoes gratinées au cheddar et lardons", { isNew: true }),
    ],
  },

  // ------------------------------------------------------------------ SALADES
  {
    slug: "salades", name: "Salades", icon: "salad",
    description: "Fraîches et généreuses.",
    products: [
      ONE("salade-poulet", "Salade Poulet", 790, "Salade verte, tomate cerise, poulet & olives"),
      ONE("salade-oceane", "Salade Océane", 790, "Salade verte, saumon, tomates cerises, chèvre & olives"),
      ONE("salade-du-chef", "Salade Du Chef", 790, "Salade verte, tomate cerise, lardons, jambon, chèvre & miel"),
    ],
  },

  // ----------------------------------------------------------------- DESSERTS
  {
    slug: "desserts", name: "Desserts", icon: "cake",
    products: [
      { slug: "tiramisu", name: "Tiramisu", description: "Au choix : Nutella, Oréo, chocolat, Spéculoos, caramel ou café", popular: true, variants: [{ name: "Unité", price: 340, default: true }], optionGroups: ["parfum-tiramisu"] },
      ONE("tarte-daim", "Tarte Daim", 340, "Tarte croustillante au Daim"),
      ONE("mousse-chocolat", "Mousse au chocolat", 340, undefined, { isNew: true }),
      ONE("cookies-3-chocolats", "Cookies 3 chocolats", 250),
      ONE("brownies", "Brownies", 250),
    ],
  },
  {
    slug: "glaces", name: "Glaces", icon: "ice-cream",
    description: "Häagen-Dazs & Ben & Jerry's — demandez-nous les parfums disponibles.",
    products: [
      ONE("glace-100ml", "Glace 100 ml", 320, "Häagen-Dazs ou Ben & Jerry's"),
      ONE("glace-500ml", "Glace 500 ml", 720, "Häagen-Dazs ou Ben & Jerry's"),
    ],
  },

  // ----------------------------------------------------------------- BOISSONS
  {
    slug: "boissons", name: "Boissons", icon: "cup",
    products: [
      ONE("coca-33", "Coca-Cola 33 cl", 180, undefined, { popular: true }),
      ONE("oasis-33", "Oasis 33 cl", 180),
      ONE("tropico-33", "Tropico 33 cl", 180),
      ONE("ice-tea-33", "Ice Tea 33 cl", 180),
      ONE("orangina-33", "Orangina 33 cl", 180),
      ONE("sprite-33", "Sprite 33 cl", 180),
      ONE("fanta-33", "Fanta 33 cl", 180),
      ONE("seven-up-33", "Seven Up 33 cl", 180),
      ONE("perrier-33", "Perrier 33 cl", 180),
      ONE("schweppes-agrumes-33", "Schweppes Agrumes 33 cl", 180),
      ONE("red-bull-33", "Red Bull 33 cl", 250),
      ONE("coca-125", "Coca-Cola 1,25 L", 330, undefined, { popular: true }),
      ONE("fanta-125", "Fanta 1,25 L", 330),
      ONE("sprite-125", "Sprite 1,25 L", 330),
      ONE("orangina-125", "Orangina 1,25 L", 330),
      ONE("ice-tea-125", "Ice Tea 1,25 L", 330),
      ONE("perrier-1l", "Perrier 1 L", 250),
      ONE("eau-50cl", "Eau 50 cl", 120),
    ],
  },
];

/** Groupes d'options. `products` liste les slugs proposés (résolus au seed). */
export const OPTION_GROUPS: {
  slug: string; name: string; min: number; max: number;
  options?: { name: string; delta?: number; default?: boolean }[];
  fromCategories?: string[];   // construit dynamiquement à partir de catégories
  variantSize?: string;        // ne garder que les produits ayant cette taille
}[] = [
  {
    slug: "base-pizza", name: "Base au choix", min: 1, max: 1,
    options: [
      { name: "Sauce tomate", default: true },
      { name: "Crème fraîche" },
    ],
  },
  {
    slug: "parfum-tiramisu", name: "Parfum", min: 1, max: 1,
    options: [
      { name: "Nutella", default: true },
      { name: "Oréo" }, { name: "Chocolat" }, { name: "Spéculoos" },
      { name: "Caramel" }, { name: "Café" },
    ],
  },
  { slug: "choix-pizza-31", name: "Votre pizza 31 cm", min: 1, max: 1, fromCategories: ["pizzas-classiques", "pizzas-viandes", "pizzas-fromages", "pizzas-veggies", "pizzas-speciales", "pizzas-oceanes"], variantSize: "31" },
  { slug: "choix-pizza-40", name: "Votre pizza 40 cm", min: 1, max: 1, fromCategories: ["pizzas-classiques", "pizzas-viandes", "pizzas-fromages", "pizzas-veggies", "pizzas-speciales", "pizzas-oceanes"], variantSize: "40" },
  { slug: "choix-entree", name: "Votre entrée", min: 1, max: 1, fromCategories: ["tex-mex"] },
  { slug: "choix-tex-mex", name: "Votre Tex Mex", min: 1, max: 1, fromCategories: ["tex-mex"] },
  { slug: "choix-salade", name: "Votre salade", min: 1, max: 1, fromCategories: ["salades"] },
  { slug: "choix-pates", name: "Vos pâtes", min: 1, max: 1, fromCategories: ["pates"] },
  { slug: "choix-dessert", name: "Votre dessert", min: 1, max: 1, fromCategories: ["desserts"] },
  { slug: "choix-dessert-glace", name: "Votre dessert ou glace", min: 1, max: 1, fromCategories: ["desserts", "glaces"] },
  { slug: "choix-boisson-33", name: "Votre boisson 33 cl", min: 1, max: 1, options: [
    { name: "Coca-Cola 33 cl", default: true }, { name: "Oasis 33 cl" }, { name: "Tropico 33 cl" },
    { name: "Ice Tea 33 cl" }, { name: "Orangina 33 cl" }, { name: "Sprite 33 cl" },
    { name: "Fanta 33 cl" }, { name: "Seven Up 33 cl" }, { name: "Perrier 33 cl" },
    { name: "Schweppes Agrumes 33 cl" }, { name: "Red Bull 33 cl", delta: 70 },
  ] },
  { slug: "choix-boisson-grande", name: "Votre boisson 1,5 L", min: 1, max: 1, options: [
    { name: "Coca-Cola 1,25 L", default: true }, { name: "Fanta 1,25 L" }, { name: "Sprite 1,25 L" },
    { name: "Orangina 1,25 L" }, { name: "Ice Tea 1,25 L" }, { name: "Perrier 1 L" },
  ] },
  { slug: "choix-enfant", name: "Votre plat", min: 1, max: 1, options: [
    { name: "Pizza jambon fromage", default: true }, { name: "4 nuggets & potatoes" },
  ] },
];

/** Suppléments pizza : +1 € en 31 cm, +1,50 € en 40 cm (tarif unique carte). */
export const EXTRAS: { slug: string; name: string; category: string }[] = [
  ["mozzarella", "Mozzarella", "fromage"], ["chevre", "Chèvre", "fromage"],
  ["roquefort", "Roquefort", "fromage"], ["emmental", "Emmental", "fromage"],
  ["cheddar", "Cheddar", "fromage"], ["reblochon", "Reblochon", "fromage"],
  ["raclette", "Raclette", "fromage"], ["bleu", "Bleu", "fromage"],
  ["jambon", "Jambon", "viande"], ["chorizo", "Chorizo", "viande"],
  ["lardons", "Lardons", "viande"], ["merguez", "Merguez", "viande"],
  ["kebab", "Kebab", "viande"], ["poulet", "Poulet", "viande"],
  ["viande-hachee", "Viande hachée", "viande"], ["magret", "Magret de canard", "viande"],
  ["thon", "Thon", "poisson"], ["saumon-fume", "Saumon fumé", "poisson"],
  ["anchois", "Anchois", "poisson"], ["fruits-de-mer", "Fruits de mer", "poisson"],
  ["champignons", "Champignons", "ingredient"], ["oignons", "Oignons", "ingredient"],
  ["poivrons", "Poivrons", "ingredient"], ["olives", "Olives", "ingredient"],
  ["ananas", "Ananas", "ingredient"], ["pommes-de-terre", "Pommes de terre", "ingredient"],
  ["tomates-cerises", "Tomates cerises", "ingredient"], ["courgettes", "Courgettes", "ingredient"],
  ["aubergines", "Aubergines", "ingredient"], ["oeuf", "Œuf", "ingredient"],
  ["miel", "Miel", "sauce"], ["persillade", "Persillade", "sauce"],
  ["creme-fraiche", "Crème fraîche", "sauce"],
].map(([slug, name, category]) => ({ slug, name, category }));

export const EXTRA_CATEGORIES = [
  "pizzas-classiques", "pizzas-viandes", "pizzas-fromages",
  "pizzas-veggies", "pizzas-speciales", "pizzas-oceanes",
];
