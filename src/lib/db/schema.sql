-- =============================================================================
-- La Roma Pizza — schéma multi-établissements
-- Postgres 15+ (Supabase en production, PGlite en local : même SQL).
-- Tous les montants sont en CENTIMES (integer) : jamais de flottant sur un prix.
-- =============================================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id                    serial PRIMARY KEY,
  slug                  text UNIQUE NOT NULL,
  name                  text NOT NULL,
  city                  text NOT NULL,
  street                text NOT NULL,
  postal_code           text NOT NULL,
  phone                 text NOT NULL,
  mobile                text,
  email                 text,
  latitude              double precision,
  longitude             double precision,
  photo                 text,
  -- Délais & capacité
  prep_time_min         integer NOT NULL DEFAULT 20,   -- minutes, click & collect
  delivery_time_min     integer NOT NULL DEFAULT 40,   -- minutes, livraison
  slot_interval_min     integer NOT NULL DEFAULT 15,   -- granularité des créneaux
  slot_capacity         integer NOT NULL DEFAULT 8,    -- commandes max par créneau
  -- Minimums de commande en livraison (centimes), midi / soir
  delivery_min_lunch    integer NOT NULL DEFAULT 990,
  delivery_min_dinner   integer NOT NULL DEFAULT 1500,
  delivery_fee          integer NOT NULL DEFAULT 0,    -- livraison gratuite
  -- Services activables établissement par établissement
  pickup_enabled        boolean NOT NULL DEFAULT true,
  delivery_enabled      boolean NOT NULL DEFAULT true,
  online_payment_enabled boolean NOT NULL DEFAULT false, -- Stripe : V2
  is_active             boolean NOT NULL DEFAULT true,
  accepting_orders      boolean NOT NULL DEFAULT true,  -- coupe-circuit "on est débordés"
  -- SEO local
  seo_title             text,
  seo_description       text,
  seo_intro             text,
  neighbourhood         text,
  google_place_url      text,
  rating                numeric(2,1),
  rating_count          integer,
  position              integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Horaires réguliers. Un jour peut avoir plusieurs plages (midi + soir).
CREATE TABLE IF NOT EXISTS restaurant_hours (
  id            serial PRIMARY KEY,
  restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  weekday       integer NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = lundi
  opens_at      text NOT NULL,   -- 'HH:MM'
  closes_at     text NOT NULL,   -- 'HH:MM'
  service       text NOT NULL DEFAULT 'midi' CHECK (service IN ('midi','soir'))
);
CREATE INDEX IF NOT EXISTS idx_hours_restaurant ON restaurant_hours(restaurant_id, weekday);

-- Fermetures exceptionnelles (jour entier ou plage horaire).
CREATE TABLE IF NOT EXISTS restaurant_closures (
  id            serial PRIMARY KEY,
  restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  starts_on     date NOT NULL,
  ends_on       date NOT NULL,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_closures_restaurant ON restaurant_closures(restaurant_id, starts_on, ends_on);

-- Zones de livraison : par commune et/ou code postal, avec minimum spécifique optionnel.
CREATE TABLE IF NOT EXISTS delivery_zones (
  id             serial PRIMARY KEY,
  restaurant_id  integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label          text NOT NULL,          -- "Bègles", "Bas Floirac"…
  city_match     text NOT NULL,          -- forme normalisée pour comparaison
  postal_codes   text[] NOT NULL DEFAULT '{}',
  min_order      integer,                -- override du minimum (centimes)
  delivery_fee   integer,                -- override des frais (centimes)
  note           text,                   -- "partie basse de la commune" …
  is_active      boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_zones_restaurant ON delivery_zones(restaurant_id);

-- ------------------------------------------------------------------ CATALOGUE

CREATE TABLE IF NOT EXISTS categories (
  id          serial PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  icon        text,
  position    integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS products (
  id             serial PRIMARY KEY,
  category_id    integer NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  slug           text UNIQUE NOT NULL,
  name           text NOT NULL,
  description    text,             -- composition / ingrédients
  image          text,
  allergens      text[] NOT NULL DEFAULT '{}',
  is_new         boolean NOT NULL DEFAULT false,
  is_popular     boolean NOT NULL DEFAULT false,
  is_halal       boolean NOT NULL DEFAULT true,
  is_vegetarian  boolean NOT NULL DEFAULT false,
  -- Un produit "composé" (menu/formule) est décrit littérairement dans description
  kind           text NOT NULL DEFAULT 'simple' CHECK (kind IN ('simple','pizza','menu')),
  -- Certaines formules sont majorées le soir ("+1€ soir" sur la carte).
  evening_surcharge integer NOT NULL DEFAULT 0,
  -- Certaines formules sont "hors livraison" (à emporter uniquement).
  availability   text NOT NULL DEFAULT 'all' CHECK (availability IN ('all','pickup','delivery')),
  position       integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Tailles / déclinaisons (31 cm, 40 cm, L, XL, 33 cl…). Toujours au moins une.
CREATE TABLE IF NOT EXISTS product_variants (
  id          serial PRIMARY KEY,
  product_id  integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        text NOT NULL,          -- "31 cm"
  short_name  text,                   -- "31"
  price       integer NOT NULL,       -- centimes, tarif de référence
  size_code   text,                   -- '31','40','L','XL' — sert aux promotions
  position    integer NOT NULL DEFAULT 0,
  is_default  boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- Groupes d'options (Base au choix, Parfum, Accompagnement…)
CREATE TABLE IF NOT EXISTS option_groups (
  id           serial PRIMARY KEY,
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  min_select   integer NOT NULL DEFAULT 0,
  max_select   integer NOT NULL DEFAULT 1,
  position     integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_options (
  id          serial PRIMARY KEY,
  group_id    integer NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name        text NOT NULL,
  price_delta integer NOT NULL DEFAULT 0,   -- centimes
  position    integer NOT NULL DEFAULT 0,
  is_default  boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_options_group ON product_options(group_id);

-- Rattachement d'un groupe d'options à un produit (ou à toute une catégorie).
CREATE TABLE IF NOT EXISTS product_option_groups (
  product_id  integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id    integer NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  position    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id)
);

-- Suppléments (ingrédients en plus). Le prix dépend de la taille de la pizza.
CREATE TABLE IF NOT EXISTS product_extras (
  id          serial PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  category    text NOT NULL DEFAULT 'ingredient', -- ingredient | fromage | viande | sauce
  -- Prix par taille : {"31": 100, "40": 150}. Fallback sur price_default.
  price_by_size jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_default integer NOT NULL DEFAULT 100,
  position    integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

-- Quels suppléments sont proposés sur quelles catégories de produits.
CREATE TABLE IF NOT EXISTS category_extras (
  category_id integer NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  extra_id    integer NOT NULL REFERENCES product_extras(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, extra_id)
);

-- Disponibilité ET prix par établissement. Absence de ligne = disponible au tarif
-- de référence. Présence = override explicite (rupture, prix local…).
CREATE TABLE IF NOT EXISTS restaurant_products (
  restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  product_id    integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_available  boolean NOT NULL DEFAULT true,
  out_of_stock  boolean NOT NULL DEFAULT false,  -- bouton "Rupture" du comptoir
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, product_id)
);

CREATE TABLE IF NOT EXISTS restaurant_variant_prices (
  restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  variant_id    integer NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price         integer NOT NULL,
  PRIMARY KEY (restaurant_id, variant_id)
);

-- ----------------------------------------------------------------- PROMOTIONS

CREATE TABLE IF NOT EXISTS promotions (
  id              serial PRIMARY KEY,
  code            text UNIQUE NOT NULL,
  name            text NOT NULL,
  description     text,
  -- buy_x_get_y : N achetés = 1 offert (le moins cher offert)
  -- percent / fixed : remise sur le sous-total
  kind            text NOT NULL CHECK (kind IN ('buy_x_get_y','percent','fixed','bundle_price')),
  buy_quantity    integer NOT NULL DEFAULT 0,
  free_quantity   integer NOT NULL DEFAULT 0,
  discount_value  integer NOT NULL DEFAULT 0,   -- % (0-100) ou centimes
  -- Portée
  order_types     text[] NOT NULL DEFAULT '{pickup,delivery}',
  category_ids    integer[] NOT NULL DEFAULT '{}',   -- vide = toutes
  product_ids     integer[] NOT NULL DEFAULT '{}',   -- vide = tous
  size_codes      text[] NOT NULL DEFAULT '{}',      -- vide = toutes tailles
  service         text NOT NULL DEFAULT 'all' CHECK (service IN ('all','midi','soir')),
  min_order       integer NOT NULL DEFAULT 0,
  starts_on       date,
  ends_on         date,
  weekdays        integer[] NOT NULL DEFAULT '{}',   -- vide = tous les jours
  is_stackable    boolean NOT NULL DEFAULT false,
  priority        integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotion_restaurants (
  promotion_id  integer NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, restaurant_id)
);

-- --------------------------------------------------------- CLIENTS & COMMANDES

CREATE TABLE IF NOT EXISTS customers (
  id          serial PRIMARY KEY,
  phone       text NOT NULL,
  first_name  text NOT NULL,
  last_name   text,
  email       text,
  orders_count integer NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone)
);

CREATE TABLE IF NOT EXISTS orders (
  id                serial PRIMARY KEY,
  code              text UNIQUE NOT NULL,          -- "R1042"
  restaurant_id     integer NOT NULL REFERENCES restaurants(id),
  customer_id       integer REFERENCES customers(id),
  public_token      text UNIQUE NOT NULL,          -- suivi sans compte
  order_type        text NOT NULL CHECK (order_type IN ('pickup','delivery')),
  status            text NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received','accepted','preparing','ready','delivering','completed','delivered','cancelled')),
  -- Coordonnées
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  phone             text NOT NULL,
  email             text,
  -- Livraison
  address           text,
  address_extra     text,
  postal_code       text,
  city              text,
  delivery_zone_id  integer REFERENCES delivery_zones(id),
  -- Timing
  scheduled_for     timestamptz NOT NULL,
  asap              boolean NOT NULL DEFAULT false,
  -- Montants recalculés serveur (centimes)
  items_total       integer NOT NULL,
  discount_total    integer NOT NULL DEFAULT 0,
  delivery_fee      integer NOT NULL DEFAULT 0,
  total             integer NOT NULL,
  applied_promotions jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_method    text NOT NULL DEFAULT 'on_site' CHECK (payment_method IN ('on_site','online')),
  payment_status    text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded')),
  notes             text,
  cancel_reason     text,
  accepted_at       timestamptz,
  ready_at          timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled ON orders(restaurant_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_orders_updated ON orders(updated_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id            serial PRIMARY KEY,
  order_id      integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    integer REFERENCES products(id),
  variant_id    integer REFERENCES product_variants(id),
  product_name  text NOT NULL,        -- figé au moment de la commande
  variant_name  text,
  quantity      integer NOT NULL CHECK (quantity > 0),
  unit_price    integer NOT NULL,     -- prix unitaire options comprises
  line_total    integer NOT NULL,
  discount      integer NOT NULL DEFAULT 0,
  instructions  text,
  position      integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_item_options (
  id            serial PRIMARY KEY,
  order_item_id integer NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('option','extra')),
  ref_id        integer,
  name          text NOT NULL,
  price_delta   integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_item_options ON order_item_options(order_item_id);

-- Journal de statut : sert au suivi client et à l'historique comptoir.
CREATE TABLE IF NOT EXISTS order_events (
  id         serial PRIMARY KEY,
  order_id   integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     text NOT NULL,
  actor      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id, created_at);

-- ---------------------------------------------------------------------- ADMIN

CREATE TABLE IF NOT EXISTS admins (
  id            serial PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('super_admin','restaurant_admin')),
  restaurant_id integer REFERENCES restaurants(id) ON DELETE CASCADE,
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id         text PRIMARY KEY,
  admin_id   integer NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON admin_sessions(admin_id);

-- Anti-spam : fenêtre glissante par téléphone / IP.
CREATE TABLE IF NOT EXISTS rate_limits (
  key        text PRIMARY KEY,
  hits       integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL
);

-- Compteur de numéros de commande, partagé par tous les établissements.
CREATE TABLE IF NOT EXISTS counters (
  name  text PRIMARY KEY,
  value integer NOT NULL DEFAULT 0
);
