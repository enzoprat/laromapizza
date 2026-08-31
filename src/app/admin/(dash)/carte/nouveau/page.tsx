import { getSuperAdminOrRedirect } from "@/lib/auth/guard";
import { listRestaurants } from "@/lib/repo/restaurants";
import { listCategories } from "@/lib/repo/admin";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await getSuperAdminOrRedirect();
  const [categories, restaurants] = await Promise.all([listCategories(), listRestaurants()]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold text-ink">Nouveau produit</h1>
      <p className="mt-0.5 text-sm text-ink-soft">
        Les tarifs par établissement se règlent après le premier enregistrement.
      </p>
      <div className="mt-5">
        <ProductForm
          product={{
            id: null, name: "", description: null, image: null, category_id: null,
            is_new: false, is_popular: false, is_vegetarian: false, is_active: true,
            kind: "simple", evening_surcharge: 0, availability: "all", allergens: [],
          }}
          categories={categories}
          restaurants={restaurants.map((r) => ({ id: r.id, name: r.name, city: r.city }))}
          variants={[]}
          availability={{}}
          localPrices={{}}
        />
      </div>
    </main>
  );
}
