import { Suspense } from "react";
import { LockKeyhole } from "lucide-react";
import { Bone, FieldSkeleton } from "@/components/skeleton";
import { ButtonLink } from "@/components/ui";
import { AuthCard } from "../auth-card";
import { ResetForm } from "./reset-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "Nova šifra — KSKS" };

export default function NewPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthCard title="Nova šifra" subtitle="Upiši novu šifru. Nakon toga si odmah prijavljen.">
      <Suspense fallback={<ResetFormSkeleton />}>
        <ResetFormWithToken searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function ResetFormWithToken({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-[14px] font-medium text-crest">
          Link nije potpun. Otvori ga ponovo iz emaila ili zatraži novi.
        </p>
        <ButtonLink href="/prijava/zaboravljena" className="h-12 w-full text-[16px] sm:h-12 sm:text-[15px]">
          Zatraži novi link
        </ButtonLink>
      </div>
    );
  }
  return <ResetForm token={token} />;
}

/** Ista polja kao ResetForm dok se čita token iz adrese */
function ResetFormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <FieldSkeleton label="Nova šifra" icon={<LockKeyhole />} />
      <FieldSkeleton label="Ponovi šifru" icon={<LockKeyhole />} />
      <Bone className="mt-1 h-12 w-full rounded-lg" />
    </div>
  );
}
