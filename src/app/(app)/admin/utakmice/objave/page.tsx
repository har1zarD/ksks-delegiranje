import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, Images } from "lucide-react";
import { getSocialSchedules } from "@/lib/data/social";
import { Empty, PageHeader } from "@/components/ui";
import { SocialBuilder } from "./builder";
import { SocialBuilderSkeleton } from "./skeleton";

export const metadata = { title: "Slike za objavu — KSKS" };

export default function SocialPage() {
  return (
    <>
      <Link href="/admin" className="-my-2.5 inline-flex items-center gap-1 py-2.5 text-[15px] font-semibold text-brand hover:opacity-75">
        <ChevronLeft className="size-4" aria-hidden="true" /> Pregled
      </Link>
      <div className="pt-4">
        <PageHeader icon={<Images />} title="Slike za objavu" subtitle="Termini i satnice za Facebook i Instagram. Izaberi utakmice, prilagodi predložak i preuzmi sliku." />
      </div>
      <Suspense fallback={<SocialBuilderSkeleton />}>
        <Builder />
      </Suspense>
    </>
  );
}

async function Builder() {
  const data = await getSocialSchedules();
  if (!data.matches.length) return <Empty icon={<Images />} title="Nema utakmica za objavu">Ovdje se nude buduće zakazane i odgođene utakmice tekuće sezone, uključujući utakmice bez kola.</Empty>;
  return <SocialBuilder {...data} />;
}
