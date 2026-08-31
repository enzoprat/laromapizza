import { dateKeyInParis, weekdayInParis } from "./time";

/**
 * Moteur de promotions.
 *
 * Fonction pure : elle reçoit des lignes déjà tarifées et rend les remises.
 * Aucune promotion n'est codée en dur — tout vient de la table `promotions`.
 */

export type Promotion = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  kind: "buy_x_get_y" | "percent" | "fixed" | "bundle_price";
  buy_quantity: number;
  free_quantity: number;
  discount_value: number;
  order_types: string[];
  category_ids: number[];
  product_ids: number[];
  size_codes: string[];
  service: "all" | "midi" | "soir";
  min_order: number;
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[];
  is_stackable: boolean;
  priority: number;
};

/** Une ligne du panier, déjà tarifée par le serveur. */
export type PricedLine = {
  key: string;
  productId: number;
  categoryId: number;
  variantId: number;
  sizeCode: string | null;
  name: string;
  quantity: number;
  /** Prix unitaire options et suppléments compris. */
  unitPrice: number;
};

export type AppliedPromotion = {
  promotionId: number;
  code: string;
  name: string;
  amount: number;
  /** Détail lisible : "Margarita 31 cm offerte". */
  detail: string;
};

export type PromotionContext = {
  orderType: "pickup" | "delivery";
  service: "midi" | "soir";
  scheduledFor: Date;
  itemsTotal: number;
};

function isEligiblePromotion(p: Promotion, ctx: PromotionContext): boolean {
  if (!p.order_types.includes(ctx.orderType)) return false;
  if (p.service !== "all" && p.service !== ctx.service) return false;
  if (p.min_order > 0 && ctx.itemsTotal < p.min_order) return false;

  const key = dateKeyInParis(ctx.scheduledFor);
  if (p.starts_on && key < p.starts_on) return false;
  if (p.ends_on && key > p.ends_on) return false;
  if (p.weekdays.length && !p.weekdays.includes(weekdayInParis(ctx.scheduledFor))) return false;
  return true;
}

function matchesLine(p: Promotion, line: PricedLine): boolean {
  if (p.category_ids.length && !p.category_ids.includes(line.categoryId)) return false;
  if (p.product_ids.length && !p.product_ids.includes(line.productId)) return false;
  if (p.size_codes.length && (!line.sizeCode || !p.size_codes.includes(line.sizeCode))) return false;
  return true;
}

/** Déplie les quantités : 2 × Roma -> deux unités, pour raisonner à l'unité. */
function expand(lines: PricedLine[], p: Promotion): { price: number; name: string }[] {
  const units: { price: number; name: string }[] = [];
  for (const l of lines) {
    if (!matchesLine(p, l)) continue;
    for (let i = 0; i < l.quantity; i++) units.push({ price: l.unitPrice, name: l.name });
  }
  return units.sort((a, b) => b.price - a.price); // du plus cher au moins cher
}

function computeOne(p: Promotion, lines: PricedLine[]): AppliedPromotion | null {
  const units = expand(lines, p);
  if (!units.length) return null;

  if (p.kind === "buy_x_get_y") {
    const groupSize = p.buy_quantity + p.free_quantity;
    if (groupSize <= 0 || units.length < groupSize) return null;
    // Dans chaque groupe trié par prix décroissant, les dernières unités sont
    // offertes : le client paie toujours les plus chères.
    let amount = 0;
    const freebies: string[] = [];
    for (let i = 0; i < units.length; i++) {
      if (i % groupSize >= p.buy_quantity) {
        amount += units[i].price;
        freebies.push(units[i].name);
      }
    }
    if (amount <= 0) return null;
    return {
      promotionId: p.id, code: p.code, name: p.name, amount,
      detail: freebies.length === 1 ? `${freebies[0]} offerte` : `${freebies.length} produits offerts`,
    };
  }

  if (p.kind === "bundle_price") {
    const size = p.buy_quantity;
    if (size <= 0 || units.length < size) return null;
    let amount = 0;
    let groups = 0;
    for (let i = 0; i + size <= units.length; i += size) {
      const sum = units.slice(i, i + size).reduce((t, u) => t + u.price, 0);
      if (sum > p.discount_value) { amount += sum - p.discount_value; groups++; }
    }
    if (amount <= 0) return null;
    return {
      promotionId: p.id, code: p.code, name: p.name, amount,
      detail: groups === 1 ? p.name : `${groups} × ${p.name}`,
    };
  }

  const eligibleTotal = units.reduce((t, u) => t + u.price, 0);
  if (p.kind === "percent") {
    const amount = Math.round((eligibleTotal * p.discount_value) / 100);
    return amount > 0
      ? { promotionId: p.id, code: p.code, name: p.name, amount, detail: `-${p.discount_value} %` }
      : null;
  }

  // fixed
  const amount = Math.min(p.discount_value, eligibleTotal);
  return amount > 0
    ? { promotionId: p.id, code: p.code, name: p.name, amount, detail: p.name }
    : null;
}

/**
 * Applique les promotions actives : toutes les cumulables, plus la meilleure
 * des non-cumulables. Le client n'a jamais son mot à dire sur le montant.
 */
export function applyPromotions(
  promotions: Promotion[],
  lines: PricedLine[],
  ctx: PromotionContext,
): { applied: AppliedPromotion[]; total: number } {
  const eligible = promotions
    .filter((p) => isEligiblePromotion(p, ctx))
    .sort((a, b) => b.priority - a.priority);

  const applied: AppliedPromotion[] = [];

  for (const p of eligible.filter((p) => p.is_stackable)) {
    const result = computeOne(p, lines);
    if (result) applied.push(result);
  }

  let best: AppliedPromotion | null = null;
  for (const p of eligible.filter((p) => !p.is_stackable)) {
    const result = computeOne(p, lines);
    if (result && (!best || result.amount > best.amount)) best = result;
  }
  if (best) applied.push(best);

  const itemsTotal = lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0);
  const total = Math.min(applied.reduce((t, a) => t + a.amount, 0), itemsTotal);
  return { applied, total };
}
