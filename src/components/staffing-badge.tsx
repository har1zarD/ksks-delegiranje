import type { StaffingSummary } from "@/lib/data/admin";
import { Status } from "@/components/ui";

/** Stanje delegiranja utakmice */
export function StaffingBadge({ staffing }: { staffing: StaffingSummary }) {
  const { missing, pending } = staffing;
  if (missing.length > 0) return <Status tone="orange">Nedostaje {missing.length}</Status>;
  if (pending > 0) return <Status tone="gold">{pending} čeka</Status>;
  return <Status tone="mint">Popunjeno</Status>;
}
