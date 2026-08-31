"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, UtensilsCrossed, Store, Percent, LogOut, Building2, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/actions";
import type { AdminUser } from "@/lib/auth/session";

const LINKS = [
  { href: "/admin", label: "Commandes", icon: LayoutGrid, superOnly: false },
  { href: "/admin/disponibilite", label: "Disponibilité", icon: PackageCheck, superOnly: false },
  { href: "/admin/restaurant", label: "Mon restaurant", icon: Store, superOnly: false },
  { href: "/admin/carte", label: "La carte", icon: UtensilsCrossed, superOnly: true },
  { href: "/admin/promotions", label: "Promotions", icon: Percent, superOnly: true },
  { href: "/admin/etablissements", label: "Établissements", icon: Building2, superOnly: true },
];

export function AdminNav({ admin }: { admin: AdminUser }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => !l.superOnly || admin.role === "super_admin");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/admin" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-rosso-600 font-display text-sm font-extrabold text-white">
            LR
          </span>
          <span className="hidden text-sm font-bold text-ink sm:block">
            {admin.role === "super_admin" ? "Direction" : admin.restaurant_name}
          </span>
        </Link>

        <nav className="no-scrollbar flex flex-1 gap-1 overflow-x-auto" aria-label="Navigation administration">
          {links.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  active ? "bg-ink text-white" : "text-ink-soft hover:bg-sand hover:text-ink",
                )}
              >
                <link.icon className="size-4" aria-hidden />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <form action={logoutAction} className="shrink-0">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-sand hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">Quitter</span>
          </button>
        </form>
      </div>
    </header>
  );
}
