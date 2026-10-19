import Link from "next/link";
import { ChevronLeft, Images } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SocialBuilderSkeleton } from "./skeleton";

export default function Loading() {
  return <>
    <Link href="/admin" className="-my-2.5 inline-flex items-center gap-1 py-2.5 text-[15px] font-semibold text-brand hover:opacity-75"><ChevronLeft className="size-4" aria-hidden="true" /> Pregled</Link>
    <div className="pt-4"><PageHeader icon={<Images />} title="Slike za objavu" subtitle="Termini i satnice za Facebook i Instagram. Izaberi utakmice, prilagodi predložak i preuzmi sliku." /></div>
    <SocialBuilderSkeleton />
  </>;
}
