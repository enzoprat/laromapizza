"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryNav } from "./CategoryNav";
import { ProductRow } from "./ProductRow";
import { ProductSheet } from "./ProductSheet";
import { UpsellSheet } from "./UpsellSheet";
import { CartBar } from "@/components/cart/CartBar";
import type { Category, Product } from "@/lib/types";
import { useCart, type SelectedRestaurant } from "@/store/cart";

/** Catégories proposées en accompagnement d'une pizza. */
const DRINK_CATEGORIES = ["boissons"];
const DESSERT_CATEGORIES = ["desserts", "glaces"];
const SUGGESTIONS_PER_ROW = 4;

export function MenuBrowser({
  categories,
  restaurant,
}: {
  categories: Category[];
  restaurant: SelectedRestaurant;
}) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [upsell, setUpsell] = useState<Product | null>(null);
  // Une seule relance par visite : proposer à chaque pizza serait pénible.
  const [upsellShown, setUpsellShown] = useState(false);

  const storeRestaurant = useCart((s) => s.restaurant);
  const selectRestaurant = useCart((s) => s.selectRestaurant);
  const switchRestaurant = useCart((s) => s.switchRestaurant);

  /**
   * L'établissement consulté devient l'établissement courant. Si le panier
   * appartenait à une autre Roma, on le vide : la carte et les tarifs peuvent
   * différer, un panier mélangé n'aurait aucun sens.
   */
  useEffect(() => {
    if (!storeRestaurant) selectRestaurant(restaurant);
    else if (storeRestaurant.id !== restaurant.id) switchRestaurant(restaurant);
  }, [restaurant, storeRestaurant, selectRestaurant, switchRestaurant]);

  const pick = useCallback(
    (slugs: string[]) => {
      const products = categories
        .filter((c) => slugs.includes(c.slug))
        .flatMap((c) => c.products)
        .filter((p) => !p.out_of_stock);
      // Les produits mis en avant d'abord, puis les moins chers.
      return [...products]
        .sort((a, b) => {
          if (a.is_popular !== b.is_popular) return a.is_popular ? -1 : 1;
          return (a.variants[0]?.price ?? 0) - (b.variants[0]?.price ?? 0);
        })
        .slice(0, SUGGESTIONS_PER_ROW);
    },
    [categories],
  );

  const drinks = useMemo(() => pick(DRINK_CATEGORIES), [pick]);
  const desserts = useMemo(() => pick(DESSERT_CATEGORIES), [pick]);

  const suggestionIds = useMemo(
    () =>
      new Set(
        categories
          .filter((c) => [...DRINK_CATEGORIES, ...DESSERT_CATEGORIES].includes(c.slug))
          .flatMap((c) => c.products.map((p) => p.id)),
      ),
    [categories],
  );

  const handleAdded = useCallback(
    (product: Product) => {
      if (product.kind !== "pizza" || upsellShown) return;
      if (!drinks.length && !desserts.length) return;
      // Rien à proposer si le panier contient déjà une boisson ou un dessert.
      const alreadyHas = useCart.getState().lines.some((l) => suggestionIds.has(l.productId));
      if (alreadyHas) return;
      setUpsellShown(true);
      setUpsell(product);
    },
    [upsellShown, drinks.length, desserts.length, suggestionIds],
  );

  return (
    <>
      <div className="sticky top-0 z-30">
        <CategoryNav categories={categories} />
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-40 sm:px-6">
        {categories.map((category) => (
          <section key={category.slug} id={`cat-${category.slug}`} className="scroll-mt-32 pt-8">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {category.name}
            </h2>
            {category.description ? (
              <p className="mt-1 text-sm leading-snug text-ink-soft">{category.description}</p>
            ) : null}

            <ul className="mt-4 space-y-2.5">
              {category.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onOpen={setSelected}
                  onAdded={handleAdded}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ProductSheet
        product={selected}
        onClose={() => setSelected(null)}
        onAdded={handleAdded}
      />

      <UpsellSheet
        trigger={upsell}
        drinks={drinks}
        desserts={desserts}
        onClose={() => setUpsell(null)}
      />

      <CartBar restaurantSlug={restaurant.slug} />
    </>
  );
}
