"use client";

import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export type SlotDayDto = {
  key: string;
  label: string;
  slots: { at: string; label: string; available: boolean }[];
};

export function SlotPicker({
  days,
  value,
  asap,
  leadMinutes,
  isOpen,
  onChange,
}: {
  days: SlotDayDto[];
  value: string | null;
  asap: boolean;
  leadMinutes: number;
  /** Le restaurant est-il ouvert à cet instant ? */
  isOpen: boolean;
  onChange: (value: string | null, asap: boolean) => void;
}) {
  // Quand c'est fermé, « dès que possible » ne veut pas dire « dans 20 minutes »
  // mais « à l'ouverture ». On affiche l'heure réelle du premier créneau.
  const firstSlot = days.flatMap((d) => d.slots).find((s) => s.available);
  const firstDayLabel = days.find((d) => d.slots.some((s) => s.available))?.label ?? "";
  if (!days.length) {
    return (
      <p className="rounded-xl bg-rosso-50 px-4 py-3 text-sm font-medium text-rosso-700">
        Aucun créneau n&apos;est disponible pour le moment. Le restaurant est fermé
        ou complet — réessayez un peu plus tard.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => onChange(null, true)}
        aria-pressed={asap}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150",
          asap ? "border-rosso-600 bg-rosso-50" : "border-line bg-white hover:border-ink/25",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rosso-600 text-white">
          <Zap className="size-4" aria-hidden />
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-ink">
            {isOpen ? "Dès que possible" : "Dès l'ouverture"}
          </span>
          <span className="block text-[13px] text-ink-soft">
            {isOpen
              ? `Environ ${leadMinutes} minutes`
              : firstSlot
                ? `${firstDayLabel.toLowerCase()} à ${firstSlot.label}`
                : "Aucun créneau disponible"}
          </span>
        </span>
      </button>

      {days.map((day) => (
        <div key={day.key}>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{day.label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {day.slots.map((slot) => {
              const selected = !asap && value === slot.at;
              return (
                <button
                  key={slot.at}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onChange(slot.at, false)}
                  aria-pressed={selected}
                  className={cn(
                    "min-w-[4.5rem] rounded-full border px-4 py-2.5 text-sm font-semibold tabular-nums transition-all duration-150 active:scale-95",
                    selected
                      ? "border-rosso-600 bg-rosso-600 text-white"
                      : slot.available
                        ? "border-line bg-white text-ink hover:border-ink/30"
                        : "cursor-not-allowed border-line bg-sand text-ink-muted line-through",
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
