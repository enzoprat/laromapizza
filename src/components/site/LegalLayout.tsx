import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4 sm:px-6">
          <Link href="/" aria-label="Retour à l'accueil"
            className="grid size-10 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-sand">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <span className="flex-1" />
          <Logo className="h-9" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
        <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:space-y-1.5">
          {children}
        </div>
      </div>
    </main>
  );
}

/** Bloc à compléter par La Roma avant la mise en ligne. */
export function ToComplete({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">
      {children}
    </mark>
  );
}
