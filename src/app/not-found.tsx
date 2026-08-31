import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-5">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center"><Logo className="h-14" /></div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Page introuvable</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Cette page n&apos;existe pas ou n&apos;existe plus. Choisissez votre Roma pour commander.
        </p>
        <Link href="/" className="btn-primary btn-lg mt-6 w-full">Voir nos pizzerias</Link>
      </div>
    </main>
  );
}
