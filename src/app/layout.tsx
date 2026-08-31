import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/utils";
import { ServiceWorker } from "@/components/site/ServiceWorker";

/**
 * Une seule police téléchargée : Fraunces, la voix de la maison.
 * L'interface utilise la pile système (SF Pro sur Apple) — zéro octet, rendu
 * natif, et un contraste franc avec le serif là où la marque doit parler.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "La Roma Pizza | Pizzeria à Bordeaux, Bègles et Cenon",
    template: "%s | La Roma Pizza",
  },
  description:
    "Commandez vos pizzas La Roma en quelques secondes. Click & collect et livraison à Bègles, Bordeaux, Bordeaux Bastide et Cenon. Pizzas 31 et 40 cm, pâtes fraîches, Tex Mex.",
  applicationName: "La Roma Pizza",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "La Roma", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: true },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "La Roma Pizza",
    url: SITE_URL,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eae9e8" },
    { media: "(prefers-color-scheme: dark)", color: "#14110f" },
  ],
  width: "device-width",
  initialScale: 1,
  // Le zoom reste autorisé : l'interdire est un problème d'accessibilité.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fraunces.variable}>
      <body className="min-h-dvh bg-mur antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
