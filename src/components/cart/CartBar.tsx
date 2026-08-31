"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/domain/money";

/**
 * Barre panier flottante.
 *
 * Elle n'apparaît qu'une fois un produit ajouté, reste sous le pouce et suit
 * l'utilisateur sur toute la carte. Elle flotte au-dessus du contenu plutôt
 * que de coller au bord : le panier reste un objet, pas un bandeau.
 */
export function CartBar({ restaurantSlug }: { restaurantSlug: string }) {
  const lines = useCart((s) => s.lines);
  const [monte, setMonte] = useState(false);

  // Le panier vient du stockage local : on attend l'hydratation pour ne pas
  // afficher un contenu différent de celui rendu côté serveur.
  useEffect(() => setMonte(true), []);

  const nombre = lines.reduce((t, l) => t + l.quantity, 0);
  const sousTotal = lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0);

  if (!monte || nombre === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pb-safe">
      <div className="pointer-events-auto mx-auto max-w-[34rem]">
        <Link
          href={`/restaurants/${restaurantSlug}/panier`}
          className="anim-monte flex h-16 w-full items-center justify-between gap-3 rounded-full bg-encre pl-5 pr-3 text-blanc shadow-releve transition-transform duration-200 active:scale-[0.985]"
        >
          <span className="flex items-center gap-3">
            <span className="relative grid size-9 place-items-center rounded-full bg-blanc/12">
              <ShoppingBag className="size-4" aria-hidden />
              <span className="chiffres absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-rosso text-[0.6875rem] font-bold">
                {nombre}
              </span>
            </span>
            <span className="text-[0.9375rem] font-semibold">Voir mon panier</span>
          </span>
          <span className="chiffres rounded-full bg-blanc/12 px-4 py-2 text-[0.9375rem] font-bold">
            {formatPrice(sousTotal)}
          </span>
        </Link>
      </div>
    </div>
  );
}
