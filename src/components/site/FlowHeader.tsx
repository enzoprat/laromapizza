import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

/** En-tête sobre des étapes de commande : pas de distraction, juste le retour. */
export function FlowHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href={backHref}
          aria-label="Retour"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-sand"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold leading-tight text-ink">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-ink-muted">{subtitle}</p> : null}
        </div>
        <Link href="/" aria-label="Accueil La Roma Pizza">
          <Logo className="h-7" />
        </Link>
      </div>
    </header>
  );
}
