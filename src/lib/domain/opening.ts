import {
  addDaysInParis, dateKeyInParis, hhmmFromMinutes, minutesFromHHMM,
  parisToInstant, partsInParis, weekdayInParis,
} from "./time";

export type OpeningHour = {
  weekday: number;        // 0 = lundi
  opens_at: string;       // "18:00"
  closes_at: string;      // "23:00"
  service: "midi" | "soir";
};

export type Closure = { starts_on: string; ends_on: string; reason: string | null };

export type OpeningStatus = {
  isOpen: boolean;
  /** "23:00" — heure de fermeture du service en cours. */
  closesAt: string | null;
  /** Prochaine ouverture si fermé. */
  nextOpening: { at: Date; label: string } | null;
  /** Plages du jour, pour affichage ("11:00 – 14:00", "18:00 – 23:00"). */
  todayRanges: { opens: string; closes: string }[];
  /** Fermeture exceptionnelle en cours. */
  closure: Closure | null;
};

const DAY_LABELS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function isClosedOn(closures: Closure[], dayKey: string): Closure | null {
  return closures.find((c) => dayKey >= c.starts_on && dayKey <= c.ends_on) ?? null;
}

/** Plages d'un jour donné, triées, hors fermeture exceptionnelle. */
function rangesFor(hours: OpeningHour[], weekday: number): OpeningHour[] {
  return hours
    .filter((h) => h.weekday === weekday)
    .sort((a, b) => minutesFromHHMM(a.opens_at) - minutesFromHHMM(b.opens_at));
}

export function getOpeningStatus(
  hours: OpeningHour[],
  closures: Closure[],
  now: Date = new Date(),
): OpeningStatus {
  const todayKey = dateKeyInParis(now);
  const todayWeekday = weekdayInParis(now);
  const nowParts = partsInParis(now);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;

  const todayClosure = isClosedOn(closures, todayKey);
  const todayRanges = rangesFor(hours, todayWeekday).map((h) => ({ opens: h.opens_at, closes: h.closes_at }));

  let isOpen = false;
  let closesAt: string | null = null;
  if (!todayClosure) {
    for (const r of todayRanges) {
      const open = minutesFromHHMM(r.opens);
      const close = minutesFromHHMM(r.closes);
      if (nowMinutes >= open && nowMinutes < close) {
        isOpen = true;
        closesAt = r.closes;
        break;
      }
    }
  }

  let nextOpening: OpeningStatus["nextOpening"] = null;
  if (!isOpen) {
    // On regarde au plus 8 jours devant : couvre une fermeture hebdomadaire
    // et les fermetures exceptionnelles de quelques jours.
    outer: for (let offset = 0; offset < 8; offset++) {
      const day = offset === 0 ? now : addDaysInParis(now, offset);
      const key = dateKeyInParis(day);
      if (isClosedOn(closures, key)) continue;
      const weekday = weekdayInParis(day);
      for (const r of rangesFor(hours, weekday)) {
        const open = minutesFromHHMM(r.opens_at);
        if (offset === 0 && open <= nowMinutes) continue;
        const p = partsInParis(day);
        const at = parisToInstant(p.year, p.month, p.day, Math.floor(open / 60), open % 60);
        const label =
          offset === 0 ? `aujourd'hui à ${r.opens_at}`
          : offset === 1 ? `demain à ${r.opens_at}`
          : `${DAY_LABELS[weekday]} à ${r.opens_at}`;
        nextOpening = { at, label };
        break outer;
      }
    }
  }

  return { isOpen, closesAt, nextOpening, todayRanges, closure: todayClosure };
}

// ---------------------------------------------------------------- CRÉNEAUX

export type Slot = { at: Date; label: string; available: boolean; full: boolean };
export type SlotDay = { key: string; label: string; slots: Slot[] };

export type SlotOptions = {
  hours: OpeningHour[];
  closures: Closure[];
  /** Délai de préparation à respecter, en minutes. */
  leadMinutes: number;
  intervalMinutes: number;
  capacity: number;
  /** Nombre de commandes déjà planifiées, indexé par ISO du créneau. */
  load?: Record<string, number>;
  daysAhead?: number;
  now?: Date;
};

/**
 * Créneaux réellement proposables : jamais avant `now + leadMinutes`, jamais
 * hors des horaires, jamais un jour de fermeture, jamais au-delà de la capacité.
 */
export function generateSlots(opts: SlotOptions): SlotDay[] {
  const {
    hours, closures, leadMinutes, intervalMinutes, capacity,
    load = {}, daysAhead = 2, now = new Date(),
  } = opts;

  const earliest = new Date(now.getTime() + leadMinutes * 60_000);
  const days: SlotDay[] = [];

  for (let offset = 0; offset <= daysAhead; offset++) {
    const day = offset === 0 ? now : addDaysInParis(now, offset);
    const key = dateKeyInParis(day);
    if (isClosedOn(closures, key)) continue;

    const p = partsInParis(day);
    const weekday = weekdayInParis(day);
    const slots: Slot[] = [];

    for (const r of rangesFor(hours, weekday)) {
      const open = minutesFromHHMM(r.opens_at);
      const close = minutesFromHHMM(r.closes_at);
      // On aligne le premier créneau sur la grille (18:00, 18:15, 18:30…).
      for (let m = open; m <= close; m += intervalMinutes) {
        const at = parisToInstant(p.year, p.month, p.day, Math.floor(m / 60), m % 60);
        if (at.getTime() < earliest.getTime()) continue;
        const taken = load[at.toISOString()] ?? 0;
        const full = capacity > 0 && taken >= capacity;
        slots.push({ at, label: hhmmFromMinutes(m), available: !full, full });
      }
    }

    if (slots.length) {
      days.push({
        key,
        label:
          offset === 0 ? "Aujourd'hui"
          : offset === 1 ? "Demain"
          : DAY_LABELS[weekday].replace(/^./, (c) => c.toUpperCase()),
        slots,
      });
    }
  }

  return days;
}

/** Le premier créneau réellement disponible, ou null. */
export function firstAvailableSlot(days: SlotDay[]): Slot | null {
  for (const d of days) for (const s of d.slots) if (s.available) return s;
  return null;
}

/** Le service (midi/soir) auquel appartient un instant — pilote les minimums. */
export function serviceAt(hours: OpeningHour[], at: Date): "midi" | "soir" {
  const weekday = weekdayInParis(at);
  const p = partsInParis(at);
  const minutes = p.hour * 60 + p.minute;
  for (const h of rangesFor(hours, weekday)) {
    if (minutes >= minutesFromHHMM(h.opens_at) && minutes <= minutesFromHHMM(h.closes_at)) {
      return h.service;
    }
  }
  return minutes < 16 * 60 ? "midi" : "soir";
}
