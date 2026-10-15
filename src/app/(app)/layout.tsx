import { Suspense } from "react";
import { getCurrentUser, type Role } from "@/lib/auth";
import { logout } from "@/app/prijava/actions";
import { InstallApp } from "@/components/install-app";
import { cx, GUTTER } from "@/components/ui";
import { AppNav, AppNavSkeleton, type NavItem } from "./nav";

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
    { href: "/admin/ljudi", label: "Službena lica", icon: "people", primary: true },
    { href: "/admin/takmicenja", label: "Takmičenja", icon: "competitions" },
    { href: "/admin/klubovi", label: "Klubovi", icon: "clubs" },
    { href: "/admin/naknade", label: "Naknade", icon: "fees" },
    { href: "/admin/statistika", label: "Statistika", icon: "stats" },
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
      <Suspense fallback={<AppNavSkeleton />}>
        <UserNav />
      </Suspense>
      <div className="flex flex-1 flex-col lg:pl-64 print:pl-0">
        <main className={cx("mx-auto w-full max-w-6xl flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-6 sm:pt-10 lg:pb-20", GUTTER)}>
          <InstallApp dismissible floating />
          {children}
        </main>
      </div>
    </>
  );
}

async function UserNav() {
  const user = await getCurrentUser();
  // Admin koji je i sudija / pomoćni sudija / komesar vidi i svoje nominacije (pod "Više" na mobitelu); Licence su uvijek zadnje
  const items: NavItem[] =
    user.role === "admin"
      ? [
          ...NAV.admin,
          ...(user.isReferee || user.isTable || user.isCommissioner ? [{ href: "/nominacije", label: "Moje nominacije", icon: "nominations" as const }] : []),
          { href: "/admin/licence", label: "Licence", icon: "licenses" },
        ]
      : NAV[user.role];
  return <AppNav items={items} user={user.fullName} roleLabel={ROLE_LABEL[user.role]} logout={logout} />;
}
