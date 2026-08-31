# La Roma Pizza — plateforme de commande

Webapp de commande multi-établissements pour les quatre pizzerias La Roma
(Bègles, Bordeaux, Bordeaux Bastide, Cenon), avec back-office comptoir et
pages locales optimisées pour le référencement.

L'objectif de conception, tenu bout à bout : **qu'une personne qui a faim
choisisse sa Roma, compose sa commande et l'envoie en moins de deux minutes
depuis son téléphone**, sans créer de compte.

---

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

Aucune base à installer : au premier démarrage, l'application crée une base
PostgreSQL embarquée dans `./.pglite`, applique le schéma et injecte la carte
complète ainsi que les quatre établissements.

**Accès à l'administration** — http://localhost:3000/admin

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Super Admin | `super@laroma-pizza.com` | `laroma2026` |
| Bègles | `begles@laroma-pizza.com` | `laroma2026` |
| Bordeaux | `bordeaux@laroma-pizza.com` | `laroma2026` |
| Bordeaux Bastide | `bordeaux-bastide@laroma-pizza.com` | `laroma2026` |
| Cenon | `cenon@laroma-pizza.com` | `laroma2026` |

> Ces mots de passe sont ceux du seed de développement. **Changez-les depuis
> _Établissements → Accès_ avant toute mise en ligne**, ou définissez
> `SEED_ADMIN_PASSWORD` avant la première création de la base.

`npm run db:reset` repart d'une base vierge.

---

## Stack et parti pris techniques

| Brique | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 15 (App Router) | Rendu serveur pour le SEO, actions serveur pour les formulaires admin |
| Langage | TypeScript strict | — |
| Styles | Tailwind CSS v4 | Thème centralisé dans `globals.css` |
| Base | PostgreSQL | PGlite en local, Supabase en production — **le même SQL** |
| Panier | Zustand + `localStorage` | Survit au rechargement, aucun compte requis |
| Temps réel | Server-Sent Events | Fonctionne à l'identique en local et en production |
| Auth admin | Sessions en base + cookie httpOnly | Voir ci-dessous |

**Un seul dialecte, deux pilotes.** `src/lib/db/index.ts` expose une interface
`query / exec / transaction`. Si `DATABASE_URL` est défini, elle parle à
Postgres via `postgres.js` ; sinon elle utilise PGlite, un vrai Postgres
compilé en WebAssembly, persisté sur disque. Migrations, requêtes et seed sont
rigoureusement identiques dans les deux cas : pas de « mode démo » qui diverge
de la production.

**Pourquoi pas Supabase Auth.** Le back-office ne compte que deux rôles et tous
les accès à la base passent par le serveur : ni RLS ni JWT côté navigateur ne
sont nécessaires. Des sessions en base donnent un comportement strictement
identique en local et en production, sans dépendre d'un service externe.
Basculer sur Supabase Auth plus tard ne toucherait que `src/lib/auth/session.ts`.

**Pourquoi SSE plutôt que Supabase Realtime.** Pour la même raison : le
tableau de bord se comporte pareil quel que soit le pilote. `EventSource` se
reconnecte tout seul, et un rafraîchissement de secours toutes les 25 secondes
couvre le cas d'un proxy qui couperait le flux.

---

## Sécurité de la commande

Le navigateur n'envoie que des **identifiants et des quantités**. Il n'envoie
aucun prix, et aucun prix venant de lui ne serait lu.

`src/lib/orders/price.ts` recalcule intégralement, à partir de la base :

- le prix de la variante, avec l'éventuel tarif propre à l'établissement ;
- les options, en vérifiant qu'elles appartiennent bien au produit ;
- les suppléments, en vérifiant qu'ils sont autorisés pour sa catégorie ;
- la majoration du soir ;
- les promotions applicables ;
- le minimum de commande, selon la zone et le service (midi / soir).

S'y ajoutent : validation Zod de tout le formulaire, contrôle du numéro de
téléphone, limitation de débit par IP **et** par téléphone, champ piège
anti-robot, créneau revalidé côté serveur (jamais un horaire fermé, passé ou
complet), et contrôle de la zone de livraison.

Vérifié en conditions réelles :

```
Prix falsifié dans la requête     → ignoré, total recalculé
Variante d'un autre produit       → « La taille choisie n'est plus disponible. »
Supplément interdit sur une boisson → « Un supplément n'est pas proposé sur ce produit. »
Livraison hors zone (Paris)       → refus + suggestion d'un autre établissement
Minimum non atteint               → « Le minimum de commande est de 15,00 € le soir. »
Produit en rupture                → « Roma est en rupture pour le moment. »
Téléphone invalide                → refus avec le champ en cause
Commande d'un autre établissement → « Cette commande ne relève pas de votre établissement. »
```

---

## Parcours client

```
Accueil  →  Carte  →  Panier  →  Coordonnées + heure  →  Confirmation  →  Suivi
```

- **Accueil** — « Dans quelle Roma souhaitez-vous commander ? », quatre cards
  avec la devanture, le statut Ouvert/Fermé calculé en direct, les horaires du
  jour et la prochaine ouverture si c'est fermé. Puis, pour le référencement
  local comme pour rassurer avant de commander : les offres en cours, le
  fonctionnement en trois étapes, les pizzas les plus commandées avec leurs
  prix, l'ensemble des catégories, **les 19 communes livrées avec le lien vers
  l'établissement qui les dessert**, et une FAQ. Tout est lu depuis la base :
  modifier la carte ou une zone dans l'administration met la page à jour.
- **Carte** — barre de catégories collante qui suit le défilement et met en
  surbrillance la section visible. Cards compactes : nom, composition, prix,
  badges. Un produit sans choix à faire s'ajoute d'un seul geste ; les autres
  ouvrent une fiche (bottom sheet sur mobile) avec taille, base, suppléments,
  quantité et instructions.
- **Formules, en étapes** — une formule demande plusieurs choix (pizza, puis
  dessert, puis boisson). Tout empiler dans un même défilement rendait la fin
  de la liste invisible : chaque choix a donc son écran, avec une barre de
  progression cliquable pour revenir en arrière, un champ de recherche dès que
  la liste dépasse douze entrées (insensible aux accents : « chevre » trouve
  « Chèvre Miel »), et un récapitulatif final avant l'ajout. Un choix unique
  enchaîne automatiquement sur l'étape suivante.
- **Boisson ou dessert** — après l'ajout d'une pizza, une feuille propose les
  boissons et desserts les plus demandés, ajoutables d'un geste. Elle ne
  s'affiche que si le panier n'en contient pas déjà, et une seule fois par
  visite.
- **Panier** — le mode de récupération se choisit ici, car les promotions
  diffèrent entre emporter et livraison : le montant affiché est donc celui
  qui sera réellement payé. Modification, suppression, réédition d'une ligne.
- **Commande** — coordonnées, adresse contrôlée en direct contre la zone de
  livraison, créneaux réels, récapitulatif, un seul gros bouton.
- **Suivi** — `/suivi/<jeton>`, sans compte, avec la frise d'avancement
  (livraison : reçue → acceptée → en préparation → en livraison → livrée).

L'établissement choisi est mémorisé pendant toute la navigation ; changer de
Roma vide le panier, les cartes et les tarifs pouvant différer.

---

## Back-office

`/admin` — deux niveaux : **Super Admin** (les quatre établissements) et
**responsable d'établissement** (le sien uniquement, y compris via l'API).

- **Commandes** — pensé pour rester ouvert sur une tablette au comptoir. Vues
  Nouvelles / À venir / En préparation / Prêtes / Livraisons / Terminées /
  Annulées, filtre emporter / livraison, recherche. Une nouvelle commande
  déclenche une pastille rouge, un clignotement et une alerte sonore (bouton
  « Activer le son » — les navigateurs exigent une interaction préalable).
  Boutons d'étape adaptés au mode, et impression d'un ticket cuisine 72 mm.
- **Disponibilité** — bouton **Rupture** immédiat, et retrait durable d'un
  produit de la carte d'un établissement.
- **Mon restaurant** — coordonnées, horaires jour par jour, fermetures
  exceptionnelles, temps de préparation, pas et capacité des créneaux,
  minimums midi / soir, zones de livraison, activation du click & collect, de
  la livraison et de la prise de commande.
- **La carte** (Super Admin) — produits, descriptions, photos, tailles, prix,
  badges, allergènes, catégories, suppléments. Et surtout :
  **disponibilité et tarif produit par produit, établissement par établissement.**
- **Promotions** (Super Admin) — aucune promotion n'est codée en dur. Règles
  « N achetées = 1 offerte », lot à prix fixe, pourcentage ou montant, avec
  périmètre (emporter / livraison, établissements, catégories, tailles),
  service midi/soir, minimum, dates, priorité et cumul.

---

## SEO

- Une page locale indexable par établissement : `/restaurants/<ville>`.
- `title`, `meta description`, `H1`, canonical et OpenGraph propres à chacune,
  modifiables depuis l'admin.
- Données structurées : `Restaurant`, `PostalAddress`,
  `OpeningHoursSpecification`, `Menu` / `MenuSection` / `MenuItem` / `Offer`,
  `BreadcrumbList`, `FAQPage`, et `AggregateRating` là où la note est connue.
- `sitemap.xml` et `robots.txt` générés — parcours de commande et admin exclus
  de l'index.
- **La carte entière est rendue côté serveur** : chaque pizza, sa composition
  et ses prix sont dans le HTML, donc lisibles par Google. Ce n'est pas une SPA
  opaque.
- FAQ construite à partir des vraies données de l'établissement (horaires,
  zones, minimums) — pas de remplissage générique.

---

## Performances

- Pages établissement pré-rendues et revalidées toutes les 60 secondes (ISR).
- ~105 kB de JavaScript partagé.
- Images en AVIF/WebP, dimensionnées, chargées en différé sauf au-dessus de la ligne de flottaison.
- PWA installable : manifeste, icônes, service worker (réseau d'abord pour les
  pages et l'API, cache pour les fichiers statiques ; l'admin n'est jamais mis
  en cache).

---

## Mise en production

1. **Créer un projet Supabase**, puis renseigner dans les variables
   d'environnement de l'hébergeur :
   ```
   DATABASE_URL="postgresql://…pooler.supabase.com:6543/postgres"
   AUTH_SECRET="<openssl rand -base64 32>"
   NEXT_PUBLIC_SITE_URL="https://laroma-pizza.com"
   SEED_ADMIN_PASSWORD="<mot de passe initial des comptes admin>"
   ```
2. **Déployer.** Au premier démarrage, le schéma s'applique et la carte est
   injectée automatiquement. Rien à exécuter à la main.
3. **Changer les mots de passe** dans _Établissements → Accès_.
4. **Vérifier horaires, adresses, téléphones et zones** dans _Mon restaurant_
   (voir la section suivante).
5. Compléter les `[champs à compléter]` surlignés dans les mentions légales et
   la politique de confidentialité.

### Paiement en ligne (V2)

La V1 fonctionne en paiement au retrait ou à la livraison. La structure est
prête pour Stripe : `orders.payment_method` / `payment_status` existent déjà,
et `restaurants.online_payment_enabled` permet au Super Admin de l'activer
**établissement par établissement**. Il reste à brancher la création de
l'intention de paiement et le webhook de confirmation.

---

## Points à confirmer par La Roma

Trois décisions relèvent du commerce, pas de la technique. Elles sont toutes
modifiables dans l'administration, sans toucher au code.

1. **Composition des menus.** La carte affiche « Menu Solo 16,90 € — 1 pizza
   31 cm ». Le supplément a donc été fixé à 0 € pour toutes les pizzas, ce qui
   est littéralement ce qui est imprimé. Mais une Cannibale 31 cm vaut 18 € :
   à ce tarif, la formule perd de l'argent. Si un écart est prévu, il se règle
   produit par produit dans _La carte → groupes d'options_.
2. **Offres « 2 pizzas 31 cm = 20 € » et « 2 pizzas 40 cm = 30 € ».** Créées
   mais **désactivées**, faute de savoir quelles pizzas elles couvrent — les
   activer telles quelles les appliquerait à toute la carte, Cannibale comprise.
   À activer dans _Promotions_ une fois le périmètre précisé.
3. ~~**Horaires.**~~ **Tranché.** La boutique en ligne actuelle de La Roma
   (`shop.laroma-pizza.com`, sous 6xpos/Zelty) expose ses propres horaires :
   lundi→samedi **11:00–14:00 et 18:00–23:00**, dimanche **18:00–23:00**.
   C'est exactement ce qui est en base. Plus rien à vérifier.

4. **Compte Instagram.** Le lien pointe vers
   `instagram.com/laromapizzaofficiel`. Je n'ai pas pu le vérifier : Instagram
   sert la même page de connexion à tous les visiteurs non identifiés, y
   compris pour un pseudo inventé — le code 200 ne prouve donc rien. Or les
   moteurs indexent un compte au nom très proche,
   **`@la_roma_pizza_officiel`** (« La Roma Pizza Bordeaux », 813 abonnés,
   83 publications), ainsi qu'un **`@laromabastide`** pour la Bastide.
   Vérifiez lequel est le bon depuis un navigateur connecté : le lien se
   corrige dans `src/lib/brand.ts`, il n'y a que cet endroit à toucher.

Le doublon **Magret** de la carte papier (17 € | 21 € puis 18 € | 22 €) est lui
aussi résolu : la boutique en ligne montre qu'il s'agit de deux recettes
distinctes, **Magret** et **Magret Chèvre**. Les deux figurent désormais au
catalogue, au bon tarif.

---

## Une note sur l'emplacement du projet

Le dossier est dans `~/Documents`, que macOS synchronise avec iCloud par
défaut. Pendant le développement, iCloud a créé dix-neuf fichiers en double
dans `.next` (`cache-life.d 2.ts`, `… 3.ts`), ce qui fait échouer la
vérification des types avec des « Duplicate identifier ». Le code source n'a
pas été touché, mais cela se reproduira.

Deux solutions : déplacer le projet hors de `~/Documents` (par exemple
`~/dev/laroma-pizza`), ou désactiver la synchronisation « Bureau et
Documents » dans Réglages Système → iCloud. En cas de doublons :
`rm -rf .next` suffit à repartir proprement.

## Structure

```
src/
  app/
    page.tsx                     Choix de l'établissement
    restaurants/[slug]/          Page locale SEO + carte
                     panier/     Panier
                     commande/   Coordonnées, créneau, validation
    suivi/[token]/               Suivi client, sans compte
    admin/                       Back-office
    api/                         quote, orders, slots, delivery-check, track, admin/*
    sitemap.ts robots.ts manifest.ts
  components/                    site, menu, cart, checkout, admin, ui
  lib/
    db/          pilote, schema.sql, seed
    domain/      time, opening, promotions, zones, money
    orders/      price (recalcul serveur), schedule (créneaux)
    repo/        accès aux données
    auth/        sessions, mots de passe, gardes
    security/    validation Zod, limitation de débit
  store/cart.ts                  Panier persistant
```

Le modèle de données couvre `restaurants`, `restaurant_hours`,
`restaurant_closures`, `delivery_zones`, `categories`, `products`,
`product_variants`, `option_groups`, `product_options`,
`product_option_groups`, `product_extras`, `category_extras`,
`restaurant_products`, `restaurant_variant_prices`, `promotions`,
`promotion_restaurants`, `customers`, `orders`, `order_items`,
`order_item_options`, `order_events`, `admins`, `admin_sessions`,
`rate_limits`, `counters`. **Toute commande est rattachée à un établissement.**

---

## Photos

**80 photos de produits** proviennent de la boutique en ligne de La Roma
(`shop.laroma-pizza.com`) : de vrais clichés professionnels, chaque plat sur le
fond brique de l'enseigne. Elles couvrent toutes les pizzas, les pâtes, les
Tex Mex, les salades, les desserts, les glaces et les boissons. Converties en
WebP : **34,7 Mo → 2,6 Mo**, soit 93 % de moins, sans perte visible.

L'association se fait par identifiant : déposer
`public/img/food/produits/<slug>.webp` suffit, aucun chemin à saisir. Les seuls
produits encore sans photo sont les formules composées (Solo, Duo, Family,
Malin, Enfant) et la pizza Poulet Miel, absentes de la boutique actuelle.

Le reste de l'identité vient des ressources existantes : logo officiel (SVG),
couleurs prises directement dedans (`#C11C1D`, `#529148`) et devantures des
quatre établissements. Ces dernières restent en petite définition
(259 × 194) : les remplacer par les photos des fiches Google améliorerait
nettement les cards d'accueil. Le chemin se change dans _Mon restaurant_.
