import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";

/**
 * Le domaine de production est le seul à être indexable.
 *
 * Une préproduction déployée sur un domaine technique (`*.vercel.app`) reste
 * une copie intégrale du site : laissée ouverte aux moteurs, elle entrerait en
 * concurrence avec laroma-pizza.com sur ses propres mots-clés. On la ferme
 * donc explicitement.
 */
const DOMAINE_PUBLIC = "laroma-pizza.com";
const estProduction = SITE_URL.includes(DOMAINE_PUBLIC);

export default function robots(): MetadataRoute.Robots {
  if (!estProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Les parcours de commande et l'administration n'ont rien à faire dans l'index.
        disallow: ["/admin", "/api/", "/suivi/", "/restaurants/*/panier", "/restaurants/*/commande"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
