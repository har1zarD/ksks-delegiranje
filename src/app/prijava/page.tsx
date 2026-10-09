import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "Prijava — KSKS" };

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-[400px]">
        <Image src="/brand/ksks-logo.svg" alt="" width={84} height={84} priority className="mx-auto mb-6 drop-" />
        <h1 className="text-center font-display text-[32px] font-semibold leading-none tracking-[-0.04em]">Delegiranje</h1>
        <p className="mb-8 mt-3 text-center text-[15px] text-fg-muted">Košarkaški savez Kantona Sarajevo</p>
        <div>
          <Suspense fallback={<div className="h-[232px]" />}>
            <LoginFormWithParams searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-[13px] text-fg-faint">Nemaš nalog ili si zaboravio šifru? Javi se savezu.</p>
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
