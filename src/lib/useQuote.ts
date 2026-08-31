"use client";

import { useEffect, useState } from "react";
import { toOrderLines, type CartLine } from "@/store/cart";
import type { OrderType } from "@/lib/types";

export type QuoteResponse = {
  itemsTotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  minimumOrder: number;
  meetsMinimum: boolean;
  applied: { promotionId: number; code: string; name: string; amount: number; detail: string }[];
  scheduledFor?: string;
  error?: string;
};

/**
 * Chiffrage serveur du panier. Le navigateur n'additionne jamais lui-même :
 * il affiche ce que le serveur lui renvoie, promotions comprises.
 */
export function useQuote(params: {
  restaurantSlug: string;
  orderType: OrderType;
  lines: CartLine[];
  scheduledFor?: string | null;
  city?: string | null;
  postalCode?: string | null;
}) {
  const { restaurantSlug, orderType, lines, scheduledFor, city, postalCode } = params;
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const payload = JSON.stringify({
    restaurant: restaurantSlug,
    orderType,
    scheduledFor: scheduledFor ?? null,
    city: city ?? null,
    postalCode: postalCode ?? null,
    lines: toOrderLines(lines),
  });

  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setQuote(data))
      .catch((e) => { if (e.name !== "AbortError") setQuote(null); })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return { quote, loading };
}
