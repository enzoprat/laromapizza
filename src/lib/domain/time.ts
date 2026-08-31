/**
 * Tout le raisonnement horaire se fait en heure de Paris, quel que soit le
 * fuseau du serveur (Vercel tourne en UTC). On ne dépend d'aucune librairie :
 * l'API Intl suffit et reste exacte aux changements d'heure.
 */

export const TZ = "Europe/Paris";

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour12: false,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

export function partsInParis(date: Date): Parts {
  const map: Record<string, string> = {};
  for (const p of PARTS.formatToParts(date)) if (p.type !== "literal") map[p.type] = p.value;
  return {
    year: Number(map.year), month: Number(map.month), day: Number(map.day),
    // À minuit, Intl peut renvoyer "24" selon l'implémentation : on normalise.
    hour: Number(map.hour) % 24, minute: Number(map.minute), second: Number(map.second),
  };
}

/** Décalage Paris↔UTC en millisecondes à un instant donné. */
function offsetAt(date: Date): number {
  const p = partsInParis(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/**
 * Heure murale parisienne -> instant absolu.
 * Deux passes : la première estime le décalage, la seconde le corrige si l'on
 * vient de traverser un changement d'heure.
 */
export function parisToInstant(y: number, m: number, d: number, hh: number, mm: number): Date {
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0);
  let instant = new Date(naive - offsetAt(new Date(naive)));
  instant = new Date(naive - offsetAt(instant));
  return instant;
}

/** 0 = lundi … 6 = dimanche (convention de la base). */
export function weekdayInParis(date: Date): number {
  const p = partsInParis(date);
  const js = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); // 0 = dimanche
  return (js + 6) % 7;
}

/** "YYYY-MM-DD" en heure de Paris — sert de clé de journée. */
export function dateKeyInParis(date: Date): string {
  const p = partsInParis(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "HH:MM" en heure de Paris. */
export function timeInParis(date: Date): string {
  const p = partsInParis(date);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function minutesFromHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function hhmmFromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addDaysInParis(date: Date, days: number): Date {
  const p = partsInParis(date);
  return parisToInstant(p.year, p.month, p.day + days, p.hour, p.minute);
}

const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
export const dayName = (weekday: number) => DAY_NAMES[weekday] ?? "";
export const dayNameCapitalized = (weekday: number) =>
  (DAY_NAMES[weekday] ?? "").replace(/^./, (c) => c.toUpperCase());

/** "aujourd'hui à 20:15", "demain à 12:00", "jeudi à 19:30". */
export function describeSlot(slot: Date, now = new Date()): string {
  const today = dateKeyInParis(now);
  const tomorrow = dateKeyInParis(addDaysInParis(now, 1));
  const key = dateKeyInParis(slot);
  const time = timeInParis(slot);
  if (key === today) return `aujourd'hui à ${time}`;
  if (key === tomorrow) return `demain à ${time}`;
  return `${dayName(weekdayInParis(slot))} à ${time}`;
}
