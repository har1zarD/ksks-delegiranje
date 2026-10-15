import { cacheLife, cacheTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { LIFE, TAG } from "@/lib/cache";
import { computePayroll, monthBounds, positionGroup } from "@/lib/finance";
import { createAdminClient } from "@/lib/supabase/admin";
import { rows } from "./db";
import { payrollRows, type PayrollPeriod } from "./finance";

// Statistika po osobi (admin): odrađene utakmice na završenim utakmicama (prihvaćena delegiranja),
// odbijene nominacije (trajna evidencija assignment_declines, jer se odbijeno delegiranje briše kad se nađe zamjena) i zarada.

export type PersonStats = {
  profileId: string;
  name: string;
  /** Završene utakmice na kojima je osoba bila (prihvaćeno delegiranje) */
  matches: number;
  /** Angažmani po vrsti (osoba može na istoj utakmici biti samo na jednoj poziciji) */
  referee: number;
  table: number;
  commissioner: number;
  /** Odbijene nominacije */
  declined: number;
  /** Zarađeno (KM), samo stavke s određenom cijenom */
  earned: number;
  /** Od toga isplaćeno i još se duguje (KM) */
  paid: number;
  unpaid: number;
  /** Neisplaćeni angažmani */
  unpaidCount: number;
  /** Angažmani bez određene cijene (nisu u zaradi) */
  missing: number;
};

async function declineRows(period: PayrollPeriod) {
  "use cache: remote";
  cacheLife(LIFE.live);
  // Evidenciju puni okidač na assignments, pa je tag delegiranja dovoljan
  cacheTag(TAG.assignments, TAG.profiles);
  let q = createAdminClient()
    .from("assignment_declines")
    .select("declined_at, profile:profiles!assignment_declines_profile_id_fkey!inner ( id, full_name )");
  if (period !== "sve") {
    const { from, to } = monthBounds(period);
    q = q.gte("declined_at", from).lt("declined_at", to);
  }
  return rows(await q.order("declined_at", { ascending: false }).limit(5000));
}

/** Statistika svih osoba u periodu (mjesec ili "sve"), sortirano po broju utakmica */
export async function getStats(period: PayrollPeriod) {
  await requireRole("admin");
  const [work, declines] = await Promise.all([payrollRows(period, null), declineRows(period)]);

  const people = new Map<string, PersonStats>();
  const personOf = (id: string, name: string) => {
    let p = people.get(id);
    if (!p) {
      p = { profileId: id, name, matches: 0, referee: 0, table: 0, commissioner: 0, declined: 0, earned: 0, paid: 0, unpaid: 0, unpaidCount: 0, missing: 0 };
      people.set(id, p);
    }
    return p;
  };

  for (const payroll of computePayroll(work)) {
    const p = personOf(payroll.profileId, payroll.name);
    p.earned = payroll.total;
    p.paid = payroll.paid;
    p.unpaid = payroll.unpaid;
    p.unpaidCount = payroll.unpaidCount;
    p.missing = payroll.missing;
    p.matches = new Set(payroll.items.map((i) => i.matchId)).size;
    for (const item of payroll.items) {
      const group = positionGroup(item.position);
      if (group === "referees") p.referee++;
      else if (group === "table") p.table++;
      else p.commissioner++;
    }
  }
  for (const d of declines) personOf(d.profile.id, d.profile.full_name).declined++;

  return [...people.values()].sort((a, b) => b.matches - a.matches || b.earned - a.earned || a.name.localeCompare(b.name, "bs"));
}
