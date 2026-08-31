"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, RefreshCw, Search, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderCard, type AdminOrder } from "./OrderCard";
import { Ticket } from "./Ticket";
import { useOrderChime } from "./useOrderChime";
import type { OrderStatus } from "@/lib/types";

const TABS = [
  { key: "nouvelles", label: "Nouvelles", countKey: "received" },
  { key: "a_venir", label: "À venir", countKey: "accepted" },
  { key: "preparation", label: "En préparation", countKey: "preparing" },
  { key: "pretes", label: "Prêtes", countKey: "ready" },
  { key: "livraisons", label: "Livraisons", countKey: "delivering" },
  { key: "terminees", label: "Terminées", countKey: null },
  { key: "annulees", label: "Annulées", countKey: null },
] as const;

const TYPES = [
  { key: "", label: "Toutes" },
  { key: "pickup", label: "Click & Collect" },
  { key: "delivery", label: "Livraison" },
] as const;

export function OrderBoard({
  restaurants,
  isSuperAdmin,
}: {
  restaurants: { id: number; name: string; city: string }[];
  isSuperAdmin: boolean;
}) {
  const [tab, setTab] = useState<string>("nouvelles");
  const [type, setType] = useState<string>("");
  const [scope, setScope] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [ticket, setTicket] = useState<AdminOrder | null>(null);

  const { play, unlock } = useOrderChime();
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ group: tab });
    if (type) params.set("type", type);
    if (search) params.set("search", search);
    if (isSuperAdmin && scope !== "all") params.set("restaurant", scope);

    const response = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setOrders(data.orders ?? []);
    setCounts(data.counts ?? {});
    setLoading(false);
  }, [tab, type, search, scope, isSuperAdmin]);

  useEffect(() => { void load(); }, [load]);

  // Flux temps réel : une nouvelle commande déclenche le son et le clignotement.
  useEffect(() => {
    const params = new URLSearchParams();
    if (isSuperAdmin && scope !== "all") params.set("restaurant", scope);
    const source = new EventSource(`/api/admin/stream?${params}`);

    source.addEventListener("orders", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { newOrders: number };
      void load();
      if (data.newOrders > 0 && !firstLoad.current) {
        if (soundOn) play();
        setFlash(true);
        window.setTimeout(() => setFlash(false), 4000);
      }
      firstLoad.current = false;
    });
    source.addEventListener("ready", () => { firstLoad.current = false; });

    return () => source.close();
  }, [load, play, soundOn, scope, isSuperAdmin]);

  // Filet de sécurité si le flux est coupé par un proxy.
  useEffect(() => {
    const timer = window.setInterval(() => void load(), 25_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const changeStatus = async (id: number, status: OrderStatus) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error ?? "Impossible de changer le statut.");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const print = (order: AdminOrder) => {
    setTicket(order);
    // Laisse React peindre le ticket avant d'ouvrir la boîte d'impression.
    window.setTimeout(() => window.print(), 80);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) { unlock(); play(1); }
  };

  return (
    <main className={cn("mx-auto max-w-7xl px-4 py-5 sm:px-6", flash && "animate-pulse-ring rounded-3xl")}>
      {/* --------------------------------------------------------- BARRE HAUTE */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink">Commandes</h1>

        {counts.received ? (
          <span className="animate-pulse-ring rounded-full bg-rosso-600 px-3 py-1 text-sm font-bold text-white">
            {counts.received} nouvelle{counts.received > 1 ? "s" : ""}
          </span>
        ) : null}

        <span className="flex-1" />

        {isSuperAdmin ? (
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            aria-label="Filtrer par établissement"
            className="h-10 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink"
          >
            <option value="all">Tous les établissements</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="N°, nom, téléphone…"
            aria-label="Rechercher une commande"
            className="h-10 w-44 rounded-full border border-line bg-white pl-9 pr-3 text-sm sm:w-56"
          />
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className={cn(
            "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
            soundOn ? "border-basil-600 bg-basil-50 text-basil-700" : "border-line bg-white text-ink-soft",
          )}
        >
          {soundOn ? <Bell className="size-4" aria-hidden /> : <BellOff className="size-4" aria-hidden />}
          {soundOn ? "Son activé" : "Activer le son"}
        </button>

        <button
          type="button"
          onClick={() => void load()}
          aria-label="Rafraîchir"
          className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:bg-sand"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
        </button>
      </div>

      {/* ------------------------------------------------------------ ONGLETS */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = t.countKey ? counts[t.countKey] ?? 0 : 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors",
                tab === t.key ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-sand",
              )}
            >
              {t.label}
              {count > 0 ? (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  tab === t.key ? "bg-white/20" : t.countKey === "received" ? "bg-rosso-600 text-white" : "bg-sand text-ink",
                )}>
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              type === t.key ? "bg-rosso-600 text-white" : "bg-white text-ink-soft hover:bg-sand",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------ LISTE */}
      {orders.length === 0 && !loading ? (
        <div className="mt-16 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-white">
            <Inbox className="size-6 text-ink-muted" aria-hidden />
          </div>
          <p className="mt-4 text-[15px] font-semibold text-ink-soft">Aucune commande dans cette vue.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              onStatus={changeStatus}
              onPrint={print}
              showRestaurant={isSuperAdmin && scope === "all"}
            />
          ))}
        </div>
      )}

      <Ticket order={ticket} />
    </main>
  );
}
