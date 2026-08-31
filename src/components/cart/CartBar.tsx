"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/domain/money";
import { useEffect, useState } from "react";

/**
 * Barre panier fixe. Elle n'apparaît qu'une fois un produit ajouté, reste
 * accessible au pouce et suit l'utilisateur sur toute la carte.
 */
export function CartBar({ restaurantSlug }: { restaurantSlug: string }) {
  const lines = useCart((s) => s.lines);
  const [mounted, setMounted] = useState(false);

  // Le panier vient du localStorage : on attend l'hydratation pour ne pas
  // afficher un contenu différent de celui rendu côté serveur.
  useEffect(() => setMounted(true), []);

  const count = lines.reduce((t, l) => t + l.quantity, 0);
  const subtotal = lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0);

  if (!mounted || count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pb-safe">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/restaurants/${restaurantSlug}/panier`}
          className="animate-rise flex h-14 w-full items-center justify-between gap-3 rounded-full bg-rosso-600 pl-5 pr-3 text-white shadow-[0_8px_28px_-6px_rgb(193_28_29/0.6)] transition-transform duration-200 active:scale-[0.98]"
        >
          <span className="flex items-center gap-2.5 font-semibold">
            <span className="relative grid size-8 place-items-center rounded-full bg-white/20">
              <ShoppingBag className="size-4" aria-hidden />
            </span>
            Voir mon panier
          </span>
          <span className="flex items-center gap-2 text-[15px] font-bold">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-sm tabular-nums">{count}</span>
            <span className="tabular-nums">{formatPrice(subtotal)}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
