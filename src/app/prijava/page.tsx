import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "Prijava — KSKS" };

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Image src="/brand/ksks-logo.svg" alt="" width={76} height={76} priority className="mx-auto mb-5" />
        <h1 className="text-center font-display text-[30px] font-semibold leading-none tracking-[-0.04em]">Delegiranje</h1>
        <p className="mb-8 mt-2.5 text-center text-[15px] text-fg-muted">Košarkaški savez Kantona Sarajevo</p>
        <div className="rounded-lg border border-line bg-panel p-5 shadow-panel sm:p-6">
          <Suspense fallback={<div className="h-[232px]" />}>
            <LoginFormWithParams searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-[13px] text-fg-muted">Nemaš nalog ili si zaboravio šifru? Javi se savezu.</p>
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
