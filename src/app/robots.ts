import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
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
