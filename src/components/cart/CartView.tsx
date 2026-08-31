"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Minus, Plus, Pencil, Trash2, Tag, ShoppingBag, Bike } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/domain/money";
import { useQuote } from "@/lib/useQuote";
import { ProductSheet, type SheetEdit } from "@/components/menu/ProductSheet";
import type { Category, OrderType, Product, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CartView({
  restaurant,
  categories,
}: {
  restaurant: Restaurant;
  categories: Category[];
}) {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeLine = useCart((s) => s.removeLine);
  const orderType = useCart((s) => s.orderType);
  const setOrderType = useCart((s) => s.setOrderType);
  const [editing, setEditing] = useState<{ product: Product; edit: SheetEdit } | null>(null);

  const productsById = useMemo(() => {
    const map = new Map<number, Product>();
    for (const c of categories) for (const p of c.products) map.set(p.id, p);
    return map;
  }, [categories]);

  // Les promotions diffèrent entre emporter et livraison : on demande le mode
  // dès le panier pour que le montant affiché soit celui qui sera réellement
  // payé — et cela fait une étape de moins au moment de valider.
  const mode: OrderType = orderType ?? (restaurant.pickup_enabled ? "pickup" : "delivery");
  const { quote } = useQuote({ restaurantSlug: restaurant.slug, orderType: mode, lines });

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-sand">
          <ShoppingBag className="size-7 text-ink-muted" aria-hidden />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">Votre panier est vide</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Ajoutez quelques pizzas et revenez ici pour valider votre commande.
        </p>
        <Link href={`/restaurants/${restaurant.slug}`} className="btn-primary btn-lg mt-6 w-full">
          Voir la carte
        </Link>
      </div>
    );
  }

  const itemsTotal = quote?.itemsTotal ?? lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0);
  const discount = quote?.discountTotal ?? 0;

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pb-44 pt-4 sm:px-6">
        {restaurant.pickup_enabled && restaurant.delivery_enabled ? (
          <div className="mb-4 flex gap-2 rounded-full bg-sand p-1">
            {([
              { value: "pickup" as const, label: "À emporter", icon: ShoppingBag },
              { value: "delivery" as const, label: "Livraison", icon: Bike },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setOrderType(option.value)}
                aria-pressed={mode === option.value}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-all duration-200",
                  mode === option.value ? "bg-white text-ink shadow-card" : "text-ink-soft hover:text-ink",
                )}
              >
                <option.icon className="size-4" aria-hidden />
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        <ul className="space-y-2.5">
          {lines.map((line) => {
            const product = productsById.get(line.productId);
            return (
              <li key={line.key} className="card p-3">
                <div className="flex gap-3">
                  {line.image ? (
                    <span className="relative block size-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                      <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-bold leading-snug text-ink">
                      {line.productName}
                      {line.variantName ? (
                        <span className="ml-1.5 text-sm font-medium text-ink-soft">{line.variantName}</span>
                      ) : null}
                    </p>

                    {line.options.length ? (
                      <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
                        {line.options.map((o) => o.name).join(", ")}
                      </p>
                    ) : null}

                    {line.instructions ? (
                      <p className="mt-0.5 text-[13px] italic leading-snug text-ink-muted">
                        « {line.instructions} »
                      </p>
                    ) : null}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5 rounded-full border border-line">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.key, line.quantity - 1)}
                          aria-label={`Retirer un ${line.productName}`}
                          className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-sand"
                        >
                          {line.quantity === 1
                            ? <Trash2 className="size-4 text-rosso-600" aria-hidden />
                            : <Minus className="size-4" aria-hidden />}
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.key, line.quantity + 1)}
                          aria-label={`Ajouter un ${line.productName}`}
                          className="grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-sand"
                        >
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {product ? (
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({
                                product,
                                edit: {
                                  key: line.key,
                                  variantId: line.variantId,
                                  optionIds: line.options.filter((o) => o.kind === "option").map((o) => o.id),
                                  extraIds: line.options.filter((o) => o.kind === "extra").map((o) => o.id),
                                  quantity: line.quantity,
                                  instructions: line.instructions,
                                },
                              })
                            }
                            aria-label={`Modifier ${line.productName}`}
                            className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sand hover:text-ink"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          aria-label={`Supprimer ${line.productName}`}
                          className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-rosso-50 hover:text-rosso-600"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                        <span className="ml-1 w-[4.5rem] text-right text-[15px] font-bold tabular-nums text-ink">
                          {formatPrice(line.unitPrice * line.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <Link
          href={`/restaurants/${restaurant.slug}`}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-ink/25 hover:text-ink"
        >
          <Plus className="size-4" aria-hidden />
          Ajouter d&apos;autres produits
        </Link>

        {/* --------------------------------------------------------- TOTAUX */}
        <div className="mt-6 space-y-2 rounded-card border border-line bg-cream p-4">
          <div className="flex justify-between text-sm text-ink-soft">
            <span>Sous-total</span>
            <span className="tabular-nums">{formatPrice(itemsTotal)}</span>
          </div>

          {quote?.applied.map((promo) => (
            <div key={promo.promotionId} className="flex justify-between gap-3 text-sm font-semibold text-basil-700">
              <span className="flex min-w-0 items-center gap-1.5">
                <Tag className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{promo.name}</span>
              </span>
              <span className="shrink-0 tabular-nums">-{formatPrice(promo.amount)}</span>
            </div>
          ))}

          <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(itemsTotal - discount)}</span>
          </div>

          <p className="pt-1 text-xs text-ink-muted">
            {mode === "delivery"
              ? "Livraison offerte. Le minimum de commande est vérifié à l'étape suivante, une fois votre adresse renseignée."
              : "Paiement au retrait : espèces, carte bancaire ou titres restaurant."}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------ ACTION */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 pb-safe backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href={`/restaurants/${restaurant.slug}`}
            aria-label="Retour à la carte"
            className="btn-ghost btn-lg aspect-square px-0"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <Link href={`/restaurants/${restaurant.slug}/commande`} className="btn-primary btn-lg flex-1">
            Commander <span aria-hidden>•</span> {formatPrice(itemsTotal - discount)}
          </Link>
        </div>
      </div>

      <ProductSheet
        product={editing?.product ?? null}
        edit={editing?.edit ?? null}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
