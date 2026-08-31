"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/domain/money";
import type { Product } from "@/lib/types";
import { useCart } from "@/store/cart";

/**
 * Proposition d'accompagnement après l'ajout d'une pizza.
 *
 * Elle ne s'affiche que si le panier ne contient encore ni boisson ni dessert,
 * et une seule fois par visite : une relance à chaque pizza serait une gêne,
 * pas un service. Chaque produit proposé s'ajoute en un geste.
 */
export function UpsellSheet({
  trigger,
  drinks,
  desserts,
  onClose,
}: {
  /** La pizza qui vient d'être ajoutée. `null` = feuille fermée. */
  trigger: Product | null;
  drinks: Product[];
  desserts: Product[];
  onClose: () => void;
}) {
  const addLine = useCart((s) => s.addLine);
  const [added, setAdded] = useState<number[]>([]);

  useEffect(() => {
    if (!trigger) return;
    setAdded([]);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [trigger, onClose]);

  if (!trigger) return null;

  const add = (product: Product) => {
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
    setAdded((prev) => [...prev, product.id]);
  };

  const Row = ({ title, items }: { title: string; items: Product[] }) => {
    if (!items.length) return null;
    return (
      <section className="mt-4 first:mt-0">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">{title}</h3>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {items.map((p) => {
            const variant = p.variants.find((v) => v.is_default) ?? p.variants[0];
            const isAdded = added.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => add(p)}
                  className={cn(
                    "flex h-full w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-[0.98]",
                    isAdded ? "border-basil-600 bg-basil-50" : "border-line bg-white hover:border-ink/20",
                  )}
                >
                  {p.image ? (
                    <span className="relative block size-11 shrink-0 overflow-hidden rounded-lg bg-sand">
                      <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 text-[13px] font-semibold leading-tight text-ink">
                      {p.name}
                    </span>
                    <span className="text-[13px] font-bold text-rosso-600">
                      {formatPrice(variant?.price ?? 0)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full transition-colors",
                      isAdded ? "bg-basil-600 text-white" : "bg-ink text-white",
                    )}
                  >
                    {isAdded ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compléter votre commande"
        className="animate-sheet-in relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white shadow-lift sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-basil-700">
              <Check className="size-3.5" aria-hidden />
              {trigger.name} ajoutée
            </p>
            <h2 className="mt-1 font-display text-xl font-bold leading-tight text-ink">
              Une boisson ou un dessert&nbsp;?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sand"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <Row title="Boissons" items={drinks} />
          <Row title="Desserts" items={desserts} />
        </div>

        <div className="shrink-0 border-t border-line bg-white p-4 pb-safe">
          <button type="button" onClick={onClose} className={added.length ? "btn-primary btn-lg w-full" : "btn-ghost btn-lg w-full"}>
            {added.length
              ? `Continuer avec ${added.length} produit${added.length > 1 ? "s" : ""}`
              : "Non merci, continuer"}
          </button>
        </div>
      </div>
    </div>
  );
}
