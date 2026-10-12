import "server-only";
import { sql } from "../db";
import { applyPromotions, type AppliedPromotion, type PricedLine, type Promotion } from "../domain/promotions";
import { serviceAt, type OpeningHour } from "../domain/opening";
import type { OrderType } from "../types";
import { jsonObject } from "../db/json";

/**
 * Recalcul serveur du panier.
 *
 * Le navigateur n'envoie que des identifiants et des quantités. Prix, options,
 * suppléments, majorations, promotions et minimum de commande sont TOUS
 * recalculés ici à partir de la base. Aucun montant venant du client n'est lu.
 */

export type CartLineInput = {
  productId: number;
  variantId: number;
  quantity: number;
  optionIds?: number[];
  extraIds?: number[];
  instructions?: string | null;
};

export type PricedLineDetail = {
  productId: number;
  variantId: number;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  instructions: string | null;
  options: { kind: "option" | "extra"; refId: number; name: string; priceDelta: number }[];
};

export type PriceBreakdown = {
  lines: PricedLineDetail[];
  itemsTotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  applied: AppliedPromotion[];
  service: "midi" | "soir";
  /** Minimum applicable en livraison (0 en click & collect). */
  minimumOrder: number;
  meetsMinimum: boolean;
};

export class PriceError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const MAX_QUANTITY_PER_LINE = 20;
const MAX_LINES = 40;

export async function priceCart(opts: {
  restaurantId: number;
  orderType: OrderType;
  scheduledFor: Date;
  lines: CartLineInput[];
  hours: OpeningHour[];
  deliveryFeeOverride?: number | null;
  minimumOverride?: number | null;
}): Promise<PriceBreakdown> {
  const { restaurantId, orderType, scheduledFor, hours } = opts;
  const input = opts.lines ?? [];

  if (!input.length) throw new PriceError("EMPTY_CART", "Votre panier est vide.");
  if (input.length > MAX_LINES) throw new PriceError("TOO_MANY_LINES", "Votre panier contient trop de lignes.");

  const productIds = [...new Set(input.map((l) => Number(l.productId)))];
  const variantIds = [...new Set(input.map((l) => Number(l.variantId)))];
  const optionIds = [...new Set(input.flatMap((l) => (l.optionIds ?? []).map(Number)))];
  const extraIds = [...new Set(input.flatMap((l) => (l.extraIds ?? []).map(Number)))];

  const [products, variants, optionRows, extraRows, groupLinks, promotions] = await Promise.all([
    sql<{ id: number; category_id: number; name: string; evening_surcharge: number;
          availability: "all" | "pickup" | "delivery"; out_of_stock: boolean }>(
      `SELECT p.id, p.category_id, p.name, p.evening_surcharge, p.availability,
              COALESCE(rp.out_of_stock, false) AS out_of_stock
       FROM products p
       LEFT JOIN restaurant_products rp ON rp.product_id = p.id AND rp.restaurant_id = $2
       WHERE p.id = ANY($1) AND p.is_active = true AND COALESCE(rp.is_available, true) = true`,
      [productIds, restaurantId],
    ),
    sql<{ id: number; product_id: number; name: string; size_code: string | null; price: number }>(
      `SELECT v.id, v.product_id, v.name, v.size_code, COALESCE(rvp.price, v.price) AS price
       FROM product_variants v
       LEFT JOIN restaurant_variant_prices rvp ON rvp.variant_id = v.id AND rvp.restaurant_id = $2
       WHERE v.id = ANY($1) AND v.is_active = true`,
      [variantIds, restaurantId],
    ),
    optionIds.length
      ? sql<{ id: number; group_id: number; name: string; price_delta: number }>(
          `SELECT id, group_id, name, price_delta FROM product_options
           WHERE id = ANY($1) AND is_active = true`, [optionIds])
      : Promise.resolve([]),
    extraIds.length
      ? sql<{ id: number; name: string; price_by_size: Record<string, number>; price_default: number }>(
          `SELECT id, name, price_by_size, price_default FROM product_extras
           WHERE id = ANY($1) AND is_active = true`, [extraIds])
      : Promise.resolve([]),
    sql<{ product_id: number; group_id: number; min_select: number; max_select: number; name: string }>(
      `SELECT pog.product_id, pog.group_id, g.min_select, g.max_select, g.name
       FROM product_option_groups pog JOIN option_groups g ON g.id = pog.group_id
       WHERE pog.product_id = ANY($1)`, [productIds],
    ),
    sql<Promotion>(
      `SELECT p.id, p.code, p.name, p.description, p.kind, p.buy_quantity, p.free_quantity,
              p.discount_value, p.order_types, p.category_ids, p.product_ids, p.size_codes,
              p.service, p.min_order, to_char(p.starts_on,'YYYY-MM-DD') AS starts_on,
              to_char(p.ends_on,'YYYY-MM-DD') AS ends_on, p.weekdays, p.is_stackable, p.priority
       FROM promotions p
       JOIN promotion_restaurants pr ON pr.promotion_id = p.id
       WHERE p.is_active = true AND pr.restaurant_id = $1`, [restaurantId],
    ),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const variantById = new Map(variants.map((v) => [v.id, v]));
  const optionById = new Map(optionRows.map((o) => [o.id, o]));
  const extraById = new Map(
    extraRows.map((e) => [e.id, { ...e, price_by_size: jsonObject<Record<string, number>>(e.price_by_size) }]),
  );

  // Suppléments réellement autorisés pour ces catégories.
  const categoryIds = [...new Set(products.map((p) => p.category_id))];
  const allowedExtras = extraIds.length
    ? new Set(
        (await sql<{ category_id: number; extra_id: number }>(
          `SELECT category_id, extra_id FROM category_extras WHERE category_id = ANY($1)`,
          [categoryIds],
        )).map((r) => `${r.category_id}:${r.extra_id}`),
      )
    : new Set<string>();

  const groupsByProduct = new Map<number, typeof groupLinks>();
  for (const g of groupLinks) {
    const list = groupsByProduct.get(g.product_id) ?? [];
    list.push(g);
    groupsByProduct.set(g.product_id, list);
  }

  const service = serviceAt(hours, scheduledFor);
  const detailed: PricedLineDetail[] = [];
  const pricedLines: PricedLine[] = [];

  for (const [index, line] of input.entries()) {
    const product = productById.get(Number(line.productId));
    if (!product) throw new PriceError("PRODUCT_UNAVAILABLE", "Un produit de votre panier n'est plus disponible.");
    if (product.out_of_stock) throw new PriceError("OUT_OF_STOCK", `${product.name} est en rupture pour le moment.`);
    if (product.availability !== "all" && product.availability !== orderType) {
      throw new PriceError(
        "WRONG_ORDER_TYPE",
        product.availability === "pickup"
          ? `${product.name} est disponible uniquement à emporter.`
          : `${product.name} est disponible uniquement en livraison.`,
      );
    }

    const variant = variantById.get(Number(line.variantId));
    if (!variant || variant.product_id !== product.id) {
      throw new PriceError("VARIANT_INVALID", "La taille choisie n'est plus disponible.");
    }

    const quantity = Math.floor(Number(line.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      throw new PriceError("QUANTITY_INVALID", "Quantité invalide.");
    }

    // --- options : seules celles rattachées au produit sont acceptées
    const productGroups = groupsByProduct.get(product.id) ?? [];
    const allowedGroupIds = new Set(productGroups.map((g) => g.group_id));
    const chosen = (line.optionIds ?? []).map(Number).map((id) => optionById.get(id)).filter(Boolean) as {
      id: number; group_id: number; name: string; price_delta: number;
    }[];
    if (chosen.length !== (line.optionIds ?? []).length) {
      throw new PriceError("OPTION_INVALID", "Une option choisie n'existe plus.");
    }
    for (const o of chosen) {
      if (!allowedGroupIds.has(o.group_id)) {
        throw new PriceError("OPTION_INVALID", "Une option ne correspond pas à ce produit.");
      }
    }
    for (const g of productGroups) {
      const count = chosen.filter((o) => o.group_id === g.group_id).length;
      if (count < g.min_select) throw new PriceError("OPTION_REQUIRED", `Veuillez choisir : ${g.name}.`);
      if (g.max_select > 0 && count > g.max_select) {
        throw new PriceError("OPTION_TOO_MANY", `Trop de choix pour : ${g.name}.`);
      }
    }

    // --- suppléments : seuls ceux autorisés pour la catégorie du produit
    const chosenExtras = (line.extraIds ?? []).map(Number).map((id) => extraById.get(id)).filter(Boolean) as {
      id: number; name: string; price_by_size: Record<string, number>; price_default: number;
    }[];
    if (chosenExtras.length !== (line.extraIds ?? []).length) {
      throw new PriceError("EXTRA_INVALID", "Un supplément choisi n'existe plus.");
    }
    for (const e of chosenExtras) {
      if (!allowedExtras.has(`${product.category_id}:${e.id}`)) {
        throw new PriceError("EXTRA_INVALID", "Un supplément n'est pas proposé sur ce produit.");
      }
    }

    const optionDelta = chosen.reduce((t, o) => t + Number(o.price_delta), 0);
    const extraDelta = chosenExtras.reduce((t, e) => {
      const bySize = variant.size_code ? Number(e.price_by_size?.[variant.size_code]) : NaN;
      return t + (Number.isFinite(bySize) ? bySize : Number(e.price_default));
    }, 0);
    const surcharge = service === "soir" ? Number(product.evening_surcharge) : 0;

    const unitPrice = Number(variant.price) + optionDelta + extraDelta + surcharge;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new PriceError("PRICE_INVALID", "Impossible de calculer le prix de ce produit.");
    }

    const instructions = (line.instructions ?? "").toString().trim().slice(0, 200) || null;

    detailed.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
      instructions,
      options: [
        ...chosen.map((o) => ({ kind: "option" as const, refId: o.id, name: o.name, priceDelta: Number(o.price_delta) })),
        ...chosenExtras.map((e) => {
          const bySize = variant.size_code ? Number(e.price_by_size?.[variant.size_code]) : NaN;
          return {
            kind: "extra" as const, refId: e.id, name: e.name,
            priceDelta: Number.isFinite(bySize) ? bySize : Number(e.price_default),
          };
        }),
      ],
    });

    pricedLines.push({
      key: `${index}`,
      productId: product.id,
      categoryId: product.category_id,
      variantId: variant.id,
      sizeCode: variant.size_code,
      name: `${product.name}${variant.size_code ? ` ${variant.name}` : ""}`,
      quantity,
      unitPrice,
    });
  }

  const itemsTotal = detailed.reduce((t, l) => t + l.lineTotal, 0);

  const { applied, total: discountTotal } = applyPromotions(
    promotions.map((p) => ({
      ...p,
      buy_quantity: Number(p.buy_quantity), free_quantity: Number(p.free_quantity),
      discount_value: Number(p.discount_value), min_order: Number(p.min_order),
      priority: Number(p.priority),
    })),
    pricedLines,
    { orderType, service, scheduledFor, itemsTotal },
  );

  const deliveryFee = orderType === "delivery" ? Number(opts.deliveryFeeOverride ?? 0) : 0;
  const minimumOrder = orderType === "delivery" ? Number(opts.minimumOverride ?? 0) : 0;
  const afterDiscount = itemsTotal - discountTotal;

  return {
    lines: detailed,
    itemsTotal,
    discountTotal,
    deliveryFee,
    total: afterDiscount + deliveryFee,
    applied,
    service,
    minimumOrder,
    meetsMinimum: orderType !== "delivery" || afterDiscount >= minimumOrder,
  };
}
