import { cn } from "@/lib/utils";

export function StatusBadge({
  isOpen,
  label,
  className,
}: {
  isOpen: boolean;
  label?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "chip",
        isOpen ? "bg-basil-100 text-basil-700" : "bg-sand text-ink-soft",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", isOpen ? "bg-basil-600" : "bg-ink-muted")}
      />
      {isOpen ? "Ouvert" : "Fermé"}
      {label ? <span className="font-medium normal-case tracking-normal opacity-80">· {label}</span> : null}
    </span>
  );
}
