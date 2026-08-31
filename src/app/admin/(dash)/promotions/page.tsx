import { Trash2 } from "lucide-react";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { listRestaurants } from "@/lib/repo/restaurants";
import { listCategories, listPromotions } from "@/lib/repo/admin";
import { PromotionForm } from "./PromotionForm";
import { deletePromotion, togglePromotion } from "./actions";
import { formatPrice } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function describe(p: Awaited<ReturnType<typeof listPromotions>>[number]) {
  switch (p.kind) {
    case "buy_x_get_y":
      return `${p.buy_quantity} acheté${p.buy_quantity > 1 ? "s" : ""} = ${p.free_quantity} offert${p.free_quantity > 1 ? "s" : ""}`;
    case "bundle_price":
      return `${p.buy_quantity} produits pour ${formatPrice(p.discount_value)}`;
    case "percent":
      return `-${p.discount_value} %`;
    default:
      return `-${formatPrice(p.discount_value)}`;
  }
}

export default async function PromotionsPage() {
  await getSuperAdminOrRedirect();
  const [promotions, restaurants, categories] = await Promise.all([
    listPromotions(), listRestaurants(), listCategories(),
  ]);

  const simplified = restaurants.map((r) => ({ id: r.id, name: r.name, city: r.city }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Promotions</h1>
      <p className="mt-0.5 text-sm text-ink-soft">
        Les règles définies ici s&apos;appliquent automatiquement au panier, côté serveur.
      </p>

      <div className="mt-5 space-y-4">
        <section className="rounded-card border border-line bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink">Promotions existantes</h2>
          <ul className="mt-3 divide-y divide-line">
            {promotions.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{p.name}</span>
                  <span className="block text-[13px] text-ink-soft">
                    {describe(p)} · {p.order_types.map((t) => (t === "pickup" ? "à emporter" : "livraison")).join(" et ")}
                    {p.size_codes.length ? ` · tailles ${p.size_codes.join(", ")}` : ""}
                    {p.min_order > 0 ? ` · min. ${formatPrice(p.min_order)}` : ""}
                    {p.starts_on || p.ends_on ? ` · ${p.starts_on ?? "…"} → ${p.ends_on ?? "…"}` : ""}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {p.restaurant_ids?.length === restaurants.length
                      ? "Tous les établissements"
                      : simplified.filter((r) => p.restaurant_ids?.includes(r.id)).map((r) => r.city).join(", ")}
                  </span>
                </span>

                <form action={togglePromotion}>
                  <input type="hidden" name="promotionId" value={p.id} />
                  <button
                    type="submit"
                    className={cn(
                      "h-9 rounded-full px-4 text-xs font-bold transition-colors",
                      p.is_active ? "bg-basil-50 text-basil-700 hover:bg-basil-100" : "bg-sand text-ink-muted hover:bg-line",
                    )}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </button>
                </form>

                <form action={deletePromotion}>
                  <input type="hidden" name="promotionId" value={p.id} />
                  <button type="submit" aria-label={`Supprimer ${p.name}`}
                    className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-rosso-50 hover:text-rosso-600">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <PromotionForm restaurants={simplified} categories={categories} />

        <details className="rounded-card border border-line bg-white p-5">
          <summary className="cursor-pointer font-display text-lg font-bold text-ink">
            Modifier une promotion existante
          </summary>
          <div className="mt-4 space-y-6">
            {promotions.map((p) => (
              <PromotionForm key={p.id} promotion={p} restaurants={simplified} categories={categories} />
            ))}
          </div>
        </details>
      </div>
    </main>
  );
}
