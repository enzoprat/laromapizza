"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderType } from "@/lib/types";

export type CartOption = {
  id: number;
  name: string;
  priceDelta: number;
  kind: "option" | "extra";
};

export type CartLine = {
  /** Identité d'une ligne : mêmes options = même ligne, la quantité s'incrémente. */
  key: string;
  productId: number;
  productSlug: string;
  productName: string;
  image: string | null;
  variantId: number;
  variantName: string | null;
  sizeCode: string | null;
  quantity: number;
  /** Prix unitaire estimé, pour l'affichage. Le serveur recalcule tout. */
  unitPrice: number;
  options: CartOption[];
  instructions: string | null;
};

export type SelectedRestaurant = {
  id: number;
  slug: string;
  name: string;
  city: string;
};

type CartState = {
  restaurant: SelectedRestaurant | null;
  orderType: OrderType | null;
  lines: CartLine[];
  hydrated: boolean;

  selectRestaurant: (r: SelectedRestaurant) => void;
  /** Change d'établissement en vidant le panier (tarifs et carte diffèrent). */
  switchRestaurant: (r: SelectedRestaurant) => void;
  setOrderType: (t: OrderType | null) => void;

  addLine: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;

  itemCount: () => number;
  subtotal: () => number;
};

export function lineKey(line: Omit<CartLine, "key" | "quantity">): string {
  const options = [...line.options].map((o) => `${o.kind}:${o.id}`).sort().join(",");
  return [line.productId, line.variantId, options, line.instructions ?? ""].join("|");
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      restaurant: null,
      orderType: null,
      lines: [],
      hydrated: false,

      selectRestaurant: (r) =>
        set((s) => (s.restaurant?.id === r.id ? s : { ...s, restaurant: r, lines: s.restaurant ? [] : s.lines })),

      switchRestaurant: (r) => set({ restaurant: r, lines: [] }),

      setOrderType: (orderType) => set({ orderType }),

      addLine: (line, quantity = 1) =>
        set((state) => {
          const key = lineKey(line);
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, quantity: Math.min(l.quantity + quantity, 20) } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, key, quantity }] };
        }),

      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(quantity, 20) } : l)),
        })),

      removeLine: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

      clear: () => set({ lines: [] }),

      itemCount: () => get().lines.reduce((t, l) => t + l.quantity, 0),
      subtotal: () => get().lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0),
    }),
    {
      name: "laroma-panier",
      version: 1,
      partialize: (s) => ({ restaurant: s.restaurant, orderType: s.orderType, lines: s.lines }),
      onRehydrateStorage: () => (state) => {
        // Empêche le décalage serveur/client au premier rendu.
        if (state) state.hydrated = true;
      },
    },
  ),
);

/** Payload minimal envoyé au serveur : aucun prix ne transite depuis le client. */
export function toOrderLines(lines: CartLine[]) {
  return lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    quantity: l.quantity,
    optionIds: l.options.filter((o) => o.kind === "option").map((o) => o.id),
    extraIds: l.options.filter((o) => o.kind === "extra").map((o) => o.id),
    instructions: l.instructions,
  }));
}
