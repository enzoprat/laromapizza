"use client";

import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/domain/money";
import type { Product } from "@/lib/types";
import { ProductBadges } from "./ProductBadges";
import { useCart } from "@/store/cart";

/**
 * Ligne de la carte.
 *
 * Rangée éditoriale plutôt que carte : un filet de séparation, pas de boîte.
 * Trente-six rectangles blancs empilés fatiguent l'œil ; une liste réglée se
 * parcourt beaucoup plus vite, et la photo garde toute l'attention.
 */
export function ProductRow({
  product,
  onOpen,
  onAdded,
}: {
  product: Product;
  onOpen: (p: Product) => void;
  onAdded?: (p: Product) => void;
}) {
  const addLine = useCart((s) => s.addLine);
  const [ajoute, setAjoute] = useState(false);

  const aDesChoix =
    product.variants.length > 1 ||
    product.optionGroups.length > 0 ||
    product.extras.length > 0;

  const prixMini = Math.min(...product.variants.map((v) => v.price));
  const indisponible = product.out_of_stock;

  const ajoutRapide = () => {
    const variante = product.variants.find((v) => v.is_default) ?? product.variants[0];
    if (!variante) return;
    addLine({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      image: product.image,
      variantId: variante.id,
      variantName: product.variants.length > 1 ? variante.name : null,
      sizeCode: variante.size_code,
      unitPrice: variante.price,
      options: [],
      instructions: null,
    });
    setAjoute(true);
    window.setTimeout(() => setAjoute(false), 1100);
    onAdded?.(product);
  };

  const action = () => {
    if (indisponible) return;
    if (aDesChoix) onOpen(product);
    else ajoutRapide();
  };

  return (
    <li className="group relative border-b border-encre/10 last:border-0">
      <button
        type="button"
        onClick={action}
        disabled={indisponible}
        className={cn(
          "flex w-full items-start gap-4 py-4 text-left transition-colors duration-200",
          indisponible ? "cursor-not-allowed opacity-45" : "hover:bg-encre/[0.035]",
        )}
        aria-label={
          indisponible
            ? `${product.name} — en rupture`
            : aDesChoix
              ? `Personnaliser ${product.name}`
              : `Ajouter ${product.name} au panier`
        }
      >
        <span className="min-w-0 flex-1 pl-1">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="voix text-[1.0625rem] font-semibold leading-snug text-encre">
              {product.name}
            </span>
            <ProductBadges product={product} />
          </span>

          {product.description ? (
            <span className="mt-1 line-clamp-2 block text-[0.8125rem] leading-relaxed text-encre-2">
              {product.description}
            </span>
          ) : null}

          <span className="chiffres mt-2 block text-[0.9375rem] font-semibold text-encre">
            {product.variants.length > 1 ? (
              <span className="text-[0.75rem] font-medium text-encre-3">dès </span>
            ) : null}
            {formatPrice(prixMini)}
          </span>

          {indisponible ? (
            <span className="etiquette mt-1.5 block text-rosso">En rupture</span>
          ) : null}
        </span>

        {product.image ? (
          <span className="relative block size-[92px] shrink-0 overflow-hidden rounded-carte bg-mur-clair">
            <Image
              src={product.image}
              alt=""
              fill
              sizes="92px"
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            />
          </span>
        ) : null}
      </button>

      {/* Bouton d'ajout : cible franche, toujours au même endroit. */}
      <button
        type="button"
        onClick={action}
        disabled={indisponible}
        aria-label={aDesChoix ? `Personnaliser ${product.name}` : `Ajouter ${product.name}`}
        className={cn(
          // Posé sur le coin de la photo, détaché par un anneau couleur mur.
          "absolute bottom-3 right-1 grid size-9 place-items-center rounded-full ring-[3px] ring-mur transition-all duration-200 active:scale-90",
          ajoute
            ? "bg-basilic text-blanc"
            : "bg-encre text-blanc hover:bg-rosso disabled:bg-encre/30",
        )}
      >
        {ajoute ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      </button>
    </li>
  );
}
