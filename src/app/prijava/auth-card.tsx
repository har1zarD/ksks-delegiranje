import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Okvir za stranice oko prijave (zaboravljena šifra, nova šifra); isti izgled kao prijava */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Image src="/brand/ksks-logo.svg" alt="" width={64} height={64} className="mx-auto mb-5" />
        <h1 className="text-center font-display text-[30px] font-semibold leading-tight tracking-[-0.04em]">{title}</h1>
        <p className="mb-8 mt-2 text-center text-[14px] text-fg-muted">{subtitle}</p>
        <div className="rounded-lg border border-line bg-panel p-5 shadow-panel sm:p-6">{children}</div>
        <p className="mt-6 text-center">
          <Link href="/prijava" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Nazad na prijavu
          </Link>
        </p>
      </div>
    </main>
  );
}
