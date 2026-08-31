import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://laroma-pizza.com").replace(/\/$/, "");

/** Lien d'itinéraire Google Maps à partir d'une adresse textuelle. */
export function mapsUrl(street: string, postalCode: string, city: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${street}, ${postalCode} ${city}`)}`;
}

/** Numéro au format composable : "05 33 51 05 47" -> "+33533510547". */
export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `+33${digits.slice(1)}` : `+${digits}`;
}
