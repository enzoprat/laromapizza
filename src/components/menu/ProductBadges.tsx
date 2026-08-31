import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductBadges({ product, className }: { product: Product; className?: string }) {
  const badges: { label: string; tone: string }[] = [];
  if (product.is_new) badges.push({ label: "Nouveau", tone: "bg-rosso text-blanc" });
  if (product.is_popular) badges.push({ label: "Populaire", tone: "bg-encre text-blanc" });
  if (product.is_vegetarian) badges.push({ label: "Veggie", tone: "bg-basilic-100 text-basilic-700" });
  if (product.availability === "pickup") badges.push({ label: "À emporter", tone: "bg-encre/8 text-encre-2" });
  if (product.availability === "delivery") badges.push({ label: "Livraison", tone: "bg-encre/8 text-encre-2" });
  if (!badges.length) return null;

  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((b) => (
        <span key={b.label} className={cn("pastille", b.tone)}>
          {b.label}
        </span>
      ))}
    </span>
  );
}
