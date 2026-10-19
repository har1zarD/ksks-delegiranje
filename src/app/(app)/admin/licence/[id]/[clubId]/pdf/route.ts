import { getClubLicenses } from "@/lib/data/licenses";
import { licensesPdf } from "@/lib/license-pdf";
import { slug } from "@/lib/format";

// PDF licenci kluba: ?preuzmi = preuzimanje, inače pregled u pregledniku. getClubLicenses provjerava admin ulogu.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; clubId: string }> }) {
  const { id, clubId } = await params;
  const data = await getClubLicenses(id, clubId);
  if (!data || data.players.length + data.officials.length === 0) return new Response("Nema licenci", { status: 404 });

  const pdf = await licensesPdf(data);
  const name = `licence-${slug(data.club.shortName ?? data.club.name)}-${slug(data.competition.name)}.pdf`;
  const download = new URL(request.url).searchParams.has("preuzmi");

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
