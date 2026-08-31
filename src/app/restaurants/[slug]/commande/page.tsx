import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/repo/restaurants";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { FlowHeader } from "@/components/site/FlowHeader";

export const metadata: Metadata = {
  title: "Valider ma commande",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <main className="min-h-dvh bg-white">
      <FlowHeader
        title="Valider ma commande"
        subtitle={restaurant.name}
        backHref={`/restaurants/${restaurant.slug}/panier`}
      />
      <CheckoutView restaurant={restaurant} />
    </main>
  );
}
