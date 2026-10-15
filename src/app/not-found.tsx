import Image from "next/image";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <Image src="/brand/ksks-logo.svg" alt="" width={56} height={56} className="mb-8 opacity-80" />
      <span className="mb-5 grid size-16 place-items-center rounded-xl border border-line bg-panel text-fg-muted"><FileQuestion className="size-7" strokeWidth={1.5} aria-hidden="true" /></span>
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-fg-muted">Greška 404</p>
      <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.04em]">Stranica nije pronađena</h1>
      <p className="mt-3 max-w-sm text-[15px] text-fg-muted">Ova stranica ne postoji. Možda je utakmica obrisana ili je link pogrešan.</p>
      <ButtonLink href="/" className="mt-8 w-full max-w-xs sm:w-auto">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Na početnu
      </ButtonLink>
    </main>
  );
}
