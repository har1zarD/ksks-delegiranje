import { getPayroll, resolveMonth } from "@/lib/data/finance";
import { payrollCsv } from "@/lib/finance";
import { formatDate, isoToSarajevo } from "@/lib/format";

// Obračun naknada za Excel. getPayroll provjerava admin ulogu.
export async function GET(request: Request) {
  const month = resolveMonth(new URL(request.url).searchParams.get("mjesec"));
  const people = await getPayroll(month);
  const csv = payrollCsv(people, (iso) => formatDate(isoToSarajevo(iso).date));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="naknade-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
