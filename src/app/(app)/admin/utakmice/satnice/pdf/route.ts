import { getRoundSchedules } from "@/lib/data/admin";
import { slug } from "@/lib/format";
import { schedulePdf, type OfficialsMode, type ScheduleSection } from "@/lib/schedule-pdf";

const OFFICIALS: Record<string, OfficialsMode> = { imena: "names", prazno: "blank", bez: "none" };

// PDF satnice kola za klubove. ?m=id,id (utakmice), s=id (slobodna ekipa, može više), naslov, naslovna/vrijeme/dvorana=0,
// lica=imena|prazno|bez, napomena, potpis; ?preuzmi = preuzimanje, inače pregled. getRoundSchedules provjerava admin ulogu.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const data = await getRoundSchedules();

  const ids = new Set((sp.get("m") ?? "").split(",").filter(Boolean));
  const free = new Set(sp.getAll("s"));
  const sections: ScheduleSection[] = data.competitions.flatMap((competition) => {
    const matches = data.matches.filter((m) => m.competitionId === competition.id && ids.has(m.id));
    if (matches.length === 0) return [];
    return [{ competition, round: matches[0].round, matches, free: competition.teams.filter((t) => free.has(t.id)).map((t) => t.name) }];
  });
  if (sections.length === 0) return new Response("Nema izabranih utakmica", { status: 404 });

  const title = sp.get("naslov")?.trim() || "Satnice";
  const pdf = await schedulePdf(sections, {
    title,
    cover: sp.get("naslovna") !== "0",
    time: sp.get("vrijeme") !== "0",
    hall: sp.get("dvorana") !== "0",
    officials: OFFICIALS[sp.get("lica") ?? ""] ?? "names",
    note: sp.get("napomena") ?? "",
    signature: sp.get("potpis") ?? "Takmičarska komisija",
  });
  const name = `satnice-${slug(title)}.pdf`;
  const download = sp.has("preuzmi");

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
