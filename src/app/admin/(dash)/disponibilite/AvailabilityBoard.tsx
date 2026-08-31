"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  id: number; name: string; category_name: string; category_slug: string;
  is_available: boolean; out_of_stock: boolean;
};

export function AvailabilityBoard({
  restaurantId,
  items,
}: {
  restaurantId: number;
  items: Item[];
}) {
  const [state, setState] = useState(items);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const groups = useMemo(() => {
    const filtered = search
      ? state.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
      : state;
    const map = new Map<string, Item[]>();
    for (const item of filtered) {
      const list = map.get(item.category_name) ?? [];
      list.push(item);
      map.set(item.category_name, list);
    }
    return [...map.entries()];
  }, [state, search]);

  const update = async (productId: number, patch: { isAvailable?: boolean; outOfStock?: boolean }) => {
    setBusy(productId);
    // Bascule optimiste : le comptoir voit l'effet immédiatement.
    setState((prev) =>
      prev.map((i) =>
        i.id === productId
          ? { ...i, is_available: patch.isAvailable ?? i.is_available, out_of_stock: patch.outOfStock ?? i.out_of_stock }
          : i,
      ),
    );
    try {
      const response = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, productId, ...patch }),
      });
      if (!response.ok) throw new Error();
    } catch {
      // On revient à l'état d'origine si le serveur a refusé.
      setState(items);
      alert("La modification n'a pas pu être enregistrée.");
    } finally {
      setBusy(null);
    }
  };

  const outCount = state.filter((i) => i.out_of_stock).length;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            aria-label="Rechercher un produit"
            className="h-11 w-full rounded-full border border-line bg-white pl-9 pr-4 text-sm sm:w-72"
          />
        </div>
        {outCount > 0 ? (
          <span className="rounded-full bg-rosso-600 px-3 py-1.5 text-sm font-bold text-white">
            {outCount} en rupture
          </span>
        ) : null}
      </div>

      <div className="mt-5 space-y-6">
        {groups.map(([category, list]) => (
          <section key={category}>
            <h2 className="font-display text-lg font-bold text-ink">{category}</h2>
            <ul className="mt-2 grid gap-2 lg:grid-cols-2">
              {list.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-white px-4 py-3",
                    item.out_of_stock ? "border-rosso-200 bg-rosso-50/50" : "border-line",
                    !item.is_available && "opacity-60",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{item.name}</span>
                    <span className="text-xs text-ink-muted">
                      {!item.is_available ? "Non proposé dans cet établissement"
                        : item.out_of_stock ? "En rupture — masqué à la commande"
                        : "Disponible"}
                    </span>
                  </span>

                  <button
                    type="button"
                    disabled={busy === item.id || !item.is_available}
                    onClick={() => update(item.id, { outOfStock: !item.out_of_stock })}
                    aria-pressed={item.out_of_stock}
                    className={cn(
                      "h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors disabled:opacity-40",
                      item.out_of_stock
                        ? "bg-rosso-600 text-white hover:bg-rosso-700"
                        : "border border-line bg-white text-ink-soft hover:bg-sand",
                    )}
                  >
                    {item.out_of_stock ? "Rupture" : "Rupture ?"}
                  </button>

                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-ink-soft">
                    <input
                      type="checkbox"
                      checked={item.is_available}
                      disabled={busy === item.id}
                      onChange={(e) => update(item.id, { isAvailable: e.target.checked })}
                      className="size-4 accent-basil-600"
                    />
                    À la carte
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
