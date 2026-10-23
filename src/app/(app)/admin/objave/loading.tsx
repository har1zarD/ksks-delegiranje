import { Images } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SocialBuilderSkeleton } from "./skeleton";

export default function Loading() {
  return <>
    <PageHeader icon={<Images />} title="Slike za objavu" subtitle="Raspored, tabela i klubovi za Facebook i Instagram. Prozirni PNG za tvoj dizajn ili gotova slika s pozadinom." />
    <SocialBuilderSkeleton />
  </>;
}
