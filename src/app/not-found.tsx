import Image from "next/image";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <Image src="/brand/ksks-logo.svg" alt="" width={56} height={56} className="mb-8 opacity-80" />
      <span className="scoreboard whitespace-nowrap text-[64px] font-semibold leading-none text-fg-faint sm:text-[80px]">404</span>
      <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.04em]">Aut</h1>
      <p className="mt-3 max-w-sm text-[15px] text-fg-muted">Ova stranica ne postoji. Možda je utakmica obrisana ili je link pogrešan.</p>
      <ButtonLink href="/" className="mt-8 w-full max-w-xs sm:w-auto">
        Na početnu
      </ButtonLink>
    </main>
  );
}
