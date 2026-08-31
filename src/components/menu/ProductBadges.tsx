import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductBadges({ product, className }: { product: Product; className?: string }) {
  const badges: { label: string; tone: string }[] = [];
  if (product.is_new) badges.push({ label: "Nouveau", tone: "bg-rosso-600 text-white" });
  if (product.is_popular) badges.push({ label: "Populaire", tone: "bg-amber-100 text-amber-800" });
  if (product.is_vegetarian) badges.push({ label: "Veggie", tone: "bg-basil-100 text-basil-700" });
  if (product.availability === "pickup") badges.push({ label: "À emporter", tone: "bg-sand text-ink-soft" });
  if (product.availability === "delivery") badges.push({ label: "Livraison", tone: "bg-sand text-ink-soft" });
  if (!badges.length) return null;

  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((b) => (
        <span key={b.label} className={cn("chip", b.tone)}>
          {b.label}
        </span>
      ))}
    </span>
  );
}
