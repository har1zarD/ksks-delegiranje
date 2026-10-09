"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string };

/** Najduži link koji odgovara putu je aktivan (/admin ne smije biti aktivan na /admin/utakmice) */
function useActive(items: NavItem[]) {
  const pathname = usePathname();
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Vercel raspored: gornja traka (grb, naziv, korisnik) + tabovi s podvučenim aktivnim */
export function AppNav({
  items,
  user,
  roleLabel,
  logout,
}: {
  items: NavItem[];
  user: string;
  roleLabel: string;
  logout: () => Promise<void>;
}) {
  const active = useActive(items);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-court/80 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="KSKS — početna">
          <Image src="/brand/ksks-logo.svg" alt="" width={26} height={26} priority />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">KSKS</span>
        </Link>
        <span className="text-[20px] font-light text-line-strong" aria-hidden>
          /
        </span>
        <span className="truncate text-[14px] text-fg-muted">Delegiranje</span>
        <div className="ml-auto">
          <UserMenu user={user} roleLabel={roleLabel} logout={logout} />
        </div>
      </div>
      <nav className="mx-auto max-w-6xl overflow-x-auto px-2 [scrollbar-width:none] sm:px-4" aria-label="Glavni meni">
        <ul className="flex">
          {items.map((item) => {
            const isActive = item.href === active;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "relative block whitespace-nowrap px-3 pb-3 pt-1 text-[14px] transition-colors",
                    isActive ? "text-fg" : "text-fg-muted hover:text-fg",
                  )}
                >
                  <span className="rounded-md px-1 py-1 hover:bg-panel-2">{item.label}</span>
                  {isActive && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-fg" aria-hidden />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function UserMenu({ user, roleLabel, logout }: { user: string; roleLabel: string; logout: () => Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  // Meni je otvoren samo za stranicu na kojoj je otvoren; navigacija ga sama zatvara
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) =>
    setOpenAt((typeof v === "function" ? v(open) : v) ? pathname : null);

  // Zatvori klikom van menija ili tipkom Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenAt(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-md border border-line-strong px-3 text-[14px] hover:bg-panel-2"
      >
        <span className="max-w-[9rem] truncate">{user}</span>
        <ChevronsUpDown className="size-4 text-fg-faint" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-60 rounded-lg border border-line-strong bg-panel p-1">
          <div className="px-3 py-2.5">
            <div className="truncate text-[14px] font-medium">{user}</div>
            <div className="text-[13px] text-fg-muted">{roleLabel}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href="/postavke" className="flex items-center justify-between rounded-md px-3 py-2 text-[14px] text-fg-muted hover:bg-panel-2 hover:text-fg">
            Postavke
            <Settings className="size-4" />
          </Link>
          <form action={logout}>
            <button type="submit" className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[14px] text-fg-muted hover:bg-panel-2 hover:text-fg">
              Odjava
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
