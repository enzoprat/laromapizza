import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { listCatalog, listCategories } from "@/lib/repo/admin";
import { formatPrice } from "@/lib/domain/money";
import { toggleProductActive } from "./actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  await getSuperAdminOrRedirect();
  const [products, categories] = await Promise.all([listCatalog(), listCategories()]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">La carte</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {products.length} produits dans {categories.length} catégories.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/carte/categories" className="btn-ghost btn-md">Catégories</Link>
          <Link href="/admin/carte/supplements" className="btn-ghost btn-md">Suppléments</Link>
          <Link href="/admin/carte/nouveau" className="btn-primary btn-md">
            <Plus className="size-4" aria-hidden />
            Nouveau produit
          </Link>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {categories.map((category) => {
          const list = products.filter((p) => p.category_id === category.id);
          if (!list.length) return null;
          return (
            <section key={category.id}>
              <h2 className="font-display text-lg font-bold text-ink">{category.name}</h2>
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
                {list.map((product) => (
                  <li key={product.id} className={cn("flex items-center gap-3 px-4 py-3", !product.is_active && "opacity-50")}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">
                        {product.name}
                        {product.is_new ? <span className="ml-2 chip bg-rosso-600 text-white">Nouveau</span> : null}
                        {product.availability !== "all" ? (
                          <span className="ml-2 chip bg-sand text-ink-soft">
                            {product.availability === "pickup" ? "À emporter" : "Livraison"}
                          </span>
                        ) : null}
                      </p>
                      {product.description ? (
                        <p className="truncate text-[13px] text-ink-soft">{product.description}</p>
                      ) : null}
                    </div>

                    <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-soft">
                      {product.variants.map((v) => formatPrice(v.price)).join(" / ") || "—"}
                    </p>

                    <form action={toggleProductActive} className="shrink-0">
                      <input type="hidden" name="productId" value={product.id} />
                      <button
                        type="submit"
                        className={cn(
                          "h-9 rounded-full px-3 text-xs font-bold transition-colors",
                          product.is_active ? "bg-basil-50 text-basil-700 hover:bg-basil-100" : "bg-sand text-ink-muted",
                        )}
                      >
                        {product.is_active ? "Actif" : "Masqué"}
                      </button>
                    </form>

                    <Link
                      href={`/admin/carte/${product.id}`}
                      aria-label={`Modifier ${product.name}`}
                      className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:bg-sand hover:text-ink"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
