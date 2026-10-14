import { getPayroll, resolvePeriod } from "@/lib/data/finance";
import { parsePayrollFilter, payrollCsv } from "@/lib/finance";
import { formatDate, isoToSarajevo } from "@/lib/format";

// Obračun naknada za Excel. getPayroll provjerava admin ulogu.
export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const month = resolvePeriod(sp.mjesec);
  const { people } = await getPayroll(month, parsePayrollFilter(sp));
  const csv = payrollCsv(people, (iso) => formatDate(isoToSarajevo(iso).date));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="naknade-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
