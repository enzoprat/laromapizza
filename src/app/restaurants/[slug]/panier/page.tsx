import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/repo/restaurants";
import { getMenu } from "@/lib/repo/menu";
import { CartView } from "@/components/cart/CartView";
import { FlowHeader } from "@/components/site/FlowHeader";

export const metadata: Metadata = {
  title: "Mon panier",
  robots: { index: false, follow: false },
};

export default async function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  // La carte sert à rouvrir une fiche produit pour modifier une ligne.
  const menu = await getMenu(restaurant.id);

  return (
    <main className="min-h-dvh bg-white">
      <FlowHeader
        title="Mon panier"
        subtitle={restaurant.name}
        backHref={`/restaurants/${restaurant.slug}`}
      />
      <CartView restaurant={restaurant} categories={menu.categories} />
    </main>
  );
}
