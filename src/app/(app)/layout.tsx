import { Suspense } from "react";
import { getCurrentUser, type Role } from "@/lib/auth";
import { logout } from "@/app/prijava/actions";
import { InstallApp } from "@/components/install-app";
import { AppNav, type NavItem } from "./nav";

const PERSONAL: NavItem[] = [
  { href: "/nominacije", label: "Nominacije", icon: "nominations" },
  { href: "/utakmice", label: "Utakmice", icon: "matches" },
  { href: "/rezultati", label: "Rezultati", icon: "results" },
  { href: "/odsustva", label: "Odsustva", icon: "absences" },
  { href: "/moje-naknade", label: "Naknade", icon: "fees" },
];

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Pregled", icon: "overview", primary: true },
    { href: "/admin/utakmice", label: "Utakmice", icon: "matches", primary: true },
    { href: "/rezultati", label: "Rezultati", icon: "results", primary: true },
    { href: "/admin/ljudi", label: "Ljudi", icon: "people", primary: true },
    { href: "/admin/takmicenja", label: "Takmičenja", icon: "competitions" },
    { href: "/admin/naknade", label: "Naknade", icon: "fees" },
    { href: "/admin/kotizacije", label: "Kotizacije", icon: "registrations" },
  ],
  official: PERSONAL,
  commissioner: PERSONAL,
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Savez",
  official: "Službeno lice",
  commissioner: "Komesar",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-14 border-b border-line bg-panel sm:h-16" />}>
        <UserNav />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-6 sm:px-6 sm:pt-10 md:pb-20">
        <InstallApp dismissible className="mb-6 md:hidden" />
        {children}
      </main>
    </>
  );
}

async function UserNav() {
  const user = await getCurrentUser();
  // Admin koji je i sudija / pomoćni sudija vidi i svoje nominacije (pod "Više" na mobitelu)
  const items =
    user.role === "admin" && (user.isReferee || user.isTable)
      ? [...NAV.admin, { href: "/nominacije", label: "Moje nominacije", icon: "nominations" as const }]
      : NAV[user.role];
  return <AppNav items={items} user={user.fullName} roleLabel={ROLE_LABEL[user.role]} logout={logout} />;
}
