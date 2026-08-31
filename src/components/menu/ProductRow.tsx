"use client";

import Image from "next/image";
import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/domain/money";
import type { Product } from "@/lib/types";
import { ProductBadges } from "./ProductBadges";
import { useCart } from "@/store/cart";

/**
 * Ligne produit compacte : beaucoup d'information, peu de hauteur.
 * Un produit sans choix à faire s'ajoute directement depuis la liste ; les
 * autres ouvrent la fiche de configuration.
 */
export function ProductRow({
  product,
  onOpen,
  onAdded,
}: {
  product: Product;
  onOpen: (p: Product) => void;
  /** Ajout direct depuis la liste : sert à proposer un accompagnement. */
  onAdded?: (p: Product) => void;
}) {
  const addLine = useCart((s) => s.addLine);
  const [justAdded, setJustAdded] = useState(false);

  const needsChoice =
    product.variants.length > 1 ||
    product.optionGroups.some((g) => g.min_select > 0) ||
    product.optionGroups.length > 0 ||
    product.extras.length > 0;

  const cheapest = Math.min(...product.variants.map((v) => v.price));
  const disabled = product.out_of_stock;

  const quickAdd = () => {
    const variant = product.variants.find((v) => v.is_default) ?? product.variants[0];
    if (!variant) return;
    addLine({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      image: product.image,
      variantId: variant.id,
      variantName: product.variants.length > 1 ? variant.name : null,
      sizeCode: variant.size_code,
      unitPrice: variant.price,
      options: [],
      instructions: null,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
    onAdded?.(product);
  };

  const handle = () => {
    if (disabled) return;
    if (needsChoice) onOpen(product);
    else quickAdd();
  };

  return (
    <li>
      <div
        className={cn(
          "group relative flex gap-3 rounded-card border border-line bg-white p-3 transition-all duration-200",
          disabled ? "opacity-55" : "hover:border-ink/15 hover:shadow-card",
        )}
      >
        <button
          type="button"
          onClick={handle}
          disabled={disabled}
          className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
          aria-label={
            disabled
              ? `${product.name} — en rupture`
              : needsChoice
                ? `Personnaliser ${product.name}`
                : `Ajouter ${product.name} au panier`
          }
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-display text-[15px] font-bold leading-snug text-ink">
                {product.name}
              </span>
              <ProductBadges product={product} />
            </span>

            {product.description ? (
              <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-ink-soft">
                {product.description}
              </span>
            ) : null}

            <span className="mt-1.5 block text-[15px] font-bold text-ink">
              {product.variants.length > 1 ? (
                <>
                  <span className="text-xs font-medium text-ink-muted">dès </span>
                  {formatPrice(cheapest)}
                </>
              ) : (
                formatPrice(cheapest)
              )}
            </span>

            {disabled ? (
              <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-rosso-600">
                En rupture
              </span>
            ) : null}
          </span>

          {product.image ? (
            <span className="relative block size-[88px] shrink-0 overflow-hidden rounded-xl bg-sand">
              <Image
                src={product.image}
                alt=""
                fill
                sizes="88px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </span>
          ) : null}
        </button>

        {/* Bouton d'ajout : cible confortable au pouce, toujours au même endroit. */}
        <button
          type="button"
          onClick={handle}
          disabled={disabled}
          aria-label={needsChoice ? `Personnaliser ${product.name}` : `Ajouter ${product.name}`}
          className={cn(
            // Le bouton chevauche le coin de la photo : l'anneau blanc l'en
            // détache pour qu'il reste lisible sur n'importe quel visuel.
            "absolute bottom-2.5 right-2.5 grid size-9 shrink-0 place-items-center rounded-full ring-2 ring-white transition-all duration-200 active:scale-90",
            justAdded
              ? "bg-basil-600 text-white"
              : "bg-ink text-white hover:bg-rosso-600 disabled:bg-line disabled:text-ink-muted",
            product.image ? "translate-y-0" : "",
          )}
        >
          {justAdded ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        </button>
      </div>
    </li>
  );
}
