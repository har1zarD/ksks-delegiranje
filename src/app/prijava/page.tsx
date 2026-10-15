import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { InstallApp } from "@/components/install-app";
import { Bone, FieldSkeleton } from "@/components/skeleton";
import { LoginForm } from "./login-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "Prijava — KSKS" };

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Image src="/brand/ksks-logo.svg" alt="" width={64} height={64} className="mx-auto mb-5" />
        <h1 className="text-center font-display text-[30px] font-semibold leading-tight tracking-[-0.04em]">Delegiranje</h1>
        <p className="mb-8 mt-2 text-center text-[14px] text-fg-muted">Košarkaški savez Kantona Sarajevo</p>
        <div className="rounded-lg border border-line bg-panel p-5 shadow-panel sm:p-6">
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginFormWithParams searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-[13px] leading-relaxed text-fg-muted">
          <Link href="/prijava/zaboravljena" className="font-semibold text-brand underline-offset-4 hover:underline">
            Zaboravljena šifra?
          </Link>
          <br />
          Za otvaranje naloga obrati se savezu.
        </p>
        <InstallApp className="mt-6" />
      </div>
    </main>
  );
}

async function LoginFormWithParams({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const notice = sp.greska === "profil" ? "Nalog nije aktivan. Javi se savezu." : undefined;
  return <LoginForm next={next} notice={notice} />;
}

/** Ista polja kao LoginForm dok se čitaju parametri adrese */
function LoginFormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <FieldSkeleton label="Email" />
      <FieldSkeleton label="Šifra" />
      <Bone className="mt-1 h-12 w-full rounded-lg" />
    </div>
  );
}
