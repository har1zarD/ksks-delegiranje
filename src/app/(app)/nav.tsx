"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CalendarOff,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  Inbox,
  LayoutGrid,
  Layers,
  LogOut,
  Receipt,
  Settings,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
  BarChart3,
  Shield,
} from "lucide-react";
import { Bone, Text } from "@/components/skeleton";
import { ThemeSwitch } from "@/components/theme-switch";
import { cx, GUTTER } from "@/components/ui";

export type NavIcon = "overview" | "matches" | "results" | "people" | "competitions" | "fees" | "registrations" | "nominations" | "absences" | "stats" | "clubs";

/** `primary` = ima mjesto u donjoj traci na mobitelu; ostale idu pod "Više" */
export type NavItem = { href: string; label: string; icon: NavIcon; primary?: boolean };

const ICONS: Record<NavIcon, LucideIcon> = {
  overview: LayoutGrid,
  matches: CalendarDays,
  results: Trophy,
  people: Users,
  competitions: Layers,
  fees: Wallet,
  registrations: Receipt,
  nominations: Inbox,
  absences: CalendarOff,
  stats: BarChart3,
  clubs: Shield,
};

/** Najduži link koji odgovara putu je aktivan (/admin ne smije biti aktivan na /admin/utakmice) */
function useActive(items: NavItem[]) {
  const pathname = usePathname();
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Gornja traka (grb, naziv, korisnik) + stavke na većem ekranu; donja traka na mobitelu */
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
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-panel/85 backdrop-blur-xl backdrop-saturate-150 print:hidden">
        <div className={cx("mx-auto flex h-16 max-w-6xl items-center gap-3 sm:h-[72px]", GUTTER)}>
          <Link href="/" className="flex h-11 min-w-0 items-center gap-2.5 transition-opacity hover:opacity-75" aria-label="KSKS — početna">
            <Image src="/brand/ksks-logo.svg" alt="" width={36} height={36} priority />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-[-0.02em]">KSKS <span className="hidden font-normal text-fg-muted sm:inline">/ Službeni portal</span></span>
              <span className="mt-0.5 truncate text-[12px] font-medium text-fg-muted">Delegiranje</span>
            </span>
          </Link>

          <div className="ml-auto shrink-0">
            <UserMenu user={user} roleLabel={roleLabel} logout={logout} />
          </div>
        </div>
          <nav className={cx("mx-auto hidden max-w-6xl pb-3 md:block", GUTTER)} aria-label="Glavni meni">
            <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              {items.map((item) => {
                const isActive = item.href === active;
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cx(
                        "flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors",
                        isActive ? "bg-brand-soft text-brand" : "text-fg-muted hover:bg-panel-2 hover:text-fg",
                      )}
                    >
                      <Icon className="hidden size-4 shrink-0 lg:block" strokeWidth={isActive ? 2 : 1.7} aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

      </header>

      <BottomNav items={items} active={active} logout={logout} />
    </>
  );
}

/** Donja navigacija (mobitel): do 5 mjesta; ako ima više stavki, 4 + "Više" */
function BottomNav({ items, active, logout }: { items: NavItem[]; active?: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [sheetAt, setSheetAt] = useState<string | null>(null);
  const sheetOpen = sheetAt === pathname; // navigacija sama zatvara listu

  const overflow = items.length > 5;
  const primary = overflow ? items.filter((i) => i.primary).slice(0, 4) : items;
  const rest = overflow ? items.filter((i) => !primary.includes(i)) : [];
  const restActive = rest.some((i) => i.href === active);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetAt(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    <>
      <nav
        aria-label="Glavni meni"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden print:hidden"
      >
        <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${primary.length + (overflow ? 1 : 0)}, minmax(0, 1fr))` }}>
          {primary.map((item) => (
            <li key={item.href}>
              <TabLink href={item.href} label={item.label} Icon={ICONS[item.icon]} active={item.href === active && !sheetOpen} />
            </li>
          ))}
          {overflow && (
            <li>
              <button
                type="button"
                onClick={() => setSheetAt(sheetOpen ? null : pathname)}
                aria-expanded={sheetOpen}
                className={cx(TAB, restActive || sheetOpen ? "text-brand" : "text-fg-faint hover:text-fg-muted")}
              >
                <Ellipsis className="size-[23px]" strokeWidth={restActive || sheetOpen ? 2.3 : 1.8} />
                <span>Više</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {sheetOpen && (
        <div className="fixed inset-0 z-30 md:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Više">
          <button type="button" aria-label="Zatvori" className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={() => setSheetAt(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain rounded-t-lg border-t border-line bg-panel pb-[calc(env(safe-area-inset-bottom)+68px)] pt-2 shadow-pop">
            <div className="mx-auto mb-1 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
            <ul className="divide-y divide-line pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
              {rest.map((item) => {
                const Icon = ICONS[item.icon];
                const isActive = item.href === active;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cx("flex h-14 items-center gap-3.5 text-[16px] font-medium", isActive ? "text-brand" : "text-fg")}
                    >
                      <Icon className={cx("size-[22px]", isActive ? "text-brand" : "text-fg-muted")} strokeWidth={1.9} />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="size-5 text-fg-faint" />
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/postavke" className="flex h-14 items-center gap-3.5 text-[16px] font-medium text-fg">
                  <Settings className="size-[22px] text-fg-muted" strokeWidth={1.9} />
                  <span className="flex-1">Postavke</span>
                  <ChevronRight className="size-5 text-fg-faint" />
                </Link>
              </li>
              <li>
                <form action={logout}>
                  <button type="submit" className="flex h-14 w-full items-center gap-3.5 text-[16px] font-medium text-crest">
                    <LogOut className="size-[22px]" strokeWidth={1.9} />
                    Odjava
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

const TAB = "flex h-[60px] w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-[-0.01em] transition-colors";

function TabLink({ href, label, Icon, active }: { href: string; label: string; Icon: LucideIcon; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cx(TAB, active ? "text-brand" : "text-fg-faint hover:text-fg-muted")}>
      <span className={cx("grid h-7 w-12 place-items-center rounded-lg", active && "bg-brand-soft")}>
        <Icon className="size-[21px]" strokeWidth={active ? 2 : 1.7} aria-hidden="true" />
      </span>
      <span className="max-w-full truncate px-1">{label}</span>
    </Link>
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
        aria-label={`${user}, meni`}
        className="flex h-11 items-center gap-2.5 rounded-lg px-2 text-[14px] font-medium transition-colors hover:bg-panel-2"
      >
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg border border-line-strong bg-panel-2 text-[11px] font-semibold text-fg-muted">{user.trim().split(/\s+/).filter(Boolean).map((part) => Array.from(part)[0]).slice(0, 2).join("")}</span>
        <span className="flex min-w-0 flex-col items-start">
          <span className="max-w-[7rem] truncate sm:max-w-[12rem]">{user}</span>
          <span className="text-[11px] font-normal text-fg-muted">{roleLabel}</span>
        </span>
        <ChevronDown className="hidden size-3.5 text-fg-muted sm:block" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-line bg-panel p-1 shadow-pop">
          <div className="px-3 py-2.5">
            <div className="truncate text-[14px] font-semibold">{user}</div>
            <div className="text-[13px] text-fg-muted">{roleLabel}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <div className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className="text-[14px] font-medium text-fg-muted">Tema</span>
            <ThemeSwitch className="w-32" />
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href="/postavke" className="flex h-10 items-center justify-between rounded-md px-3 text-[14px] font-medium text-fg-muted hover:bg-panel-2 hover:text-fg">
            Postavke
            <Settings className="size-4" />
          </Link>
          <form action={logout}>
            <button type="submit" className="flex h-10 w-full items-center justify-between rounded-md px-3 text-[14px] font-medium text-fg-muted hover:bg-panel-2 hover:text-crest">
              Odjava
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Navigacija dok se čita korisnik: isti grb i naziv, stavke i ime kao kosti, donja traka na mobitelu */
export function AppNavSkeleton() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-panel/85 backdrop-blur-xl backdrop-saturate-150 print:hidden">
        <div className={cx("mx-auto flex h-16 max-w-6xl items-center gap-3 sm:h-[72px]", GUTTER)}>
          <span className="flex h-11 min-w-0 items-center gap-2.5">
            <Image src="/brand/ksks-logo.svg" alt="" width={36} height={36} priority />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-[-0.02em]">KSKS <span className="hidden font-normal text-fg-muted sm:inline">/ Službeni portal</span></span>
              <span className="mt-0.5 truncate text-[12px] font-medium text-fg-muted">Delegiranje</span>
            </span>
          </span>
          <div className="ml-auto flex h-11 shrink-0 items-center gap-2.5 px-2">
            <Bone className="size-8 rounded-lg" />
            <span>
              <Text className="text-[14px]" w="w-24" />
              <Text className="text-[11px]" w="w-16" />
            </span>
            <Bone className="hidden size-3.5 sm:block" />
          </div>
        </div>
        <div className={cx("mx-auto hidden max-w-6xl pb-3 md:block", GUTTER)} aria-hidden>
          <ul className="flex items-center gap-1 overflow-hidden">
            {["w-14", "w-16", "w-16", "w-10", "w-20", "w-16", "w-16"].map((w, i) => (
              <li key={i} className="flex h-10 shrink-0 items-center gap-2 px-3">
                <Bone className="hidden size-4 lg:block" />
                <Text className="text-[13px]" w={w} />
              </li>
            ))}
          </ul>
        </div>
      </header>
      <nav
        aria-hidden
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden print:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className={TAB}>
              <span className="grid h-7 w-12 place-items-center">
                <Bone className="size-[21px] rounded-md" />
              </span>
              <Text className="text-[11px]" w="w-10" />
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
