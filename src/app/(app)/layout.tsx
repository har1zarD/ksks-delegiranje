import { Suspense } from "react";
import { getCurrentUser, type Role } from "@/lib/auth";
import { logout } from "@/app/prijava/actions";
import { AppNav, type NavItem } from "./nav";

const PERSONAL: NavItem[] = [
  { href: "/nominacije", label: "Nominacije" },
  { href: "/utakmice", label: "Utakmice" },
  { href: "/rezultati", label: "Rezultati" },
  { href: "/odsustva", label: "Odsustva" },
  { href: "/moje-naknade", label: "Naknade" },
];

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Pregled" },
    { href: "/admin/utakmice", label: "Utakmice" },
    { href: "/rezultati", label: "Rezultati" },
    { href: "/admin/ljudi", label: "Ljudi" },
    { href: "/admin/takmicenja", label: "Takmičenja" },
    { href: "/admin/naknade", label: "Naknade" },
    { href: "/admin/kotizacije", label: "Kotizacije" },
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
      <Suspense fallback={<div className="h-[97px] border-b border-line" />}>
        <UserNav />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-10">{children}</main>
    </>
  );
}

async function UserNav() {
  const user = await getCurrentUser();
  return <AppNav items={NAV[user.role]} user={user.fullName} roleLabel={ROLE_LABEL[user.role]} logout={logout} />;
}
