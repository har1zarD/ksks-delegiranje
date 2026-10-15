import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser, type Role } from "@/lib/auth";
import { ButtonSkeleton, Skeleton, Text, times } from "@/components/skeleton";
import { Button } from "@/components/ui";
import { decide } from "./actions";
import { backTo, checkAuthorizeRequest } from "./request";

export const metadata = { title: "Povezivanje — KSKS" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CAN: Record<Role, string[]> = {
  admin: ["utakmice, raspored i delegiranje", "slanje nominacija", "rezultate, tabele i naknade"],
  official: ["tvoje nominacije (prihvati ili odbij)", "tvoje utakmice i odsustva"],
  commissioner: ["tvoje nominacije i utakmice", "unos rezultata i bilten na tvojim utakmicama"],
};

const ROLE_LABEL: Record<Role, string> = { admin: "savez", official: "službeno lice", commissioner: "komesar" };

export default function AuthorizePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <Image src="/brand/ksks-logo.svg" alt="" width={56} height={56} priority className="mx-auto mb-5" />
        <Suspense fallback={<ConsentSkeleton />}>
          <Consent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Consent({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser(); // neprijavljenog proxy već šalje na /prijava i vraća ovamo
  const req = await checkAuthorizeRequest(sp);

  if ("error" in req) {
    return (
      <div className="rounded-lg border border-line bg-panel p-6 text-center shadow-panel">
        <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em]">Povezivanje nije moguće</h1>
        <p className="mt-2 text-[15px] text-fg-muted">{req.error}</p>
      </div>
    );
  }
  if (req.redirectError) redirect(backTo(req.params.redirect_uri, { error: req.redirectError, state: req.params.state }));

  const { client, params } = req;
  const host = new URL(params.redirect_uri).host;

  return (
    <div className="rounded-lg border border-line bg-panel p-5 shadow-panel sm:p-6">
      <h1 className="text-center font-display text-[24px] font-semibold leading-tight tracking-[-0.03em]">
        {client.name} traži pristup
      </h1>
      <p className="mt-2 text-center text-[15px] text-fg-muted">
        Radiće u KSKS Delegiranju kao <span className="font-semibold text-fg">{user.fullName}</span> ({ROLE_LABEL[user.role]}).
      </p>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[13px] font-medium text-fg-muted">Moći će čitati i mijenjati</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-[15px]">
          {CAN[user.role].map((c) => (
            <li key={c} className="flex gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-fg-faint" aria-hidden />
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-fg-muted">
          Pristup možeš opozvati bilo kad u Postavkama. Nakon potvrde vraćaš se na <span className="font-medium text-fg">{host}</span>.
        </p>
      </div>

      <form action={decide} className="mt-6 grid grid-cols-2 gap-2">
        {Object.entries(params).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <Button type="submit" name="decision" value="deny" variant="secondary">
          Odbij
        </Button>
        <Button type="submit" name="decision" value="allow">
          Dozvoli
        </Button>
      </form>
    </div>
  );
}

/** Kao kartica za saglasnost: ko traži pristup, šta smije, Odbij / Dozvoli */
function ConsentSkeleton() {
  return (
    <Skeleton className="rounded-lg border border-line bg-panel p-5 shadow-panel sm:p-6">
      <Text className="text-center font-display text-[24px] font-semibold leading-tight" w="w-60" />
      <Text className="mt-2 text-center text-[15px]" w="w-72" />
      <Text className="text-center text-[15px]" w="w-40" />
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[13px] font-medium text-fg-muted">Moći će čitati i mijenjati</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-[15px]">
          {times(3, (i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-fg-faint" aria-hidden />
              <Text w={i % 2 ? "w-48" : "w-60"} />
            </li>
          ))}
        </ul>
        <Text className="mt-4 text-[13px]" w="w-full" />
        <Text className="text-[13px]" w="w-48" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <ButtonSkeleton />
        <ButtonSkeleton />
      </div>
    </Skeleton>
  );
}
