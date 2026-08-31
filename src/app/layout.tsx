import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/utils";
import { ServiceWorker } from "@/components/site/ServiceWorker";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
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
  appleWebApp: { capable: true, title: "La Roma", statusBarStyle: "default" },
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
  themeColor: "#c11c1d",
  width: "device-width",
  initialScale: 1,
  // On autorise le zoom : l'interdire est un problème d'accessibilité.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-white antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
