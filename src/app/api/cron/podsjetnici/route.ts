import { MATCH_SELECT } from "@/lib/data/selects";
import { sendEmail } from "@/lib/email";
import { pendingReminderEmail, reminderEmail } from "@/lib/emails";
import { isoToSarajevo, sarajevoToISO } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

const PENDING_AFTER_HOURS = 48;

// Vercel Cron (vercel.json), jednom dnevno. Vercel šalje Authorization: Bearer $CRON_SECRET.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const tomorrow = isoToSarajevo(new Date(now + 86_400_000).toISOString()).date;
  const dayAfter = isoToSarajevo(new Date(now + 2 * 86_400_000).toISOString()).date;
  const select = `id, position, status, notified_at, profile:profiles!assignments_profile_id_fkey ( id, full_name, email ), match:matches!assignments_match_id_fkey!inner ( ${MATCH_SELECT} )` as const;

  const [accepted, pending] = await Promise.all([
    // Prihvaćene nominacije za sutrašnje utakmice
    supabase
      .from("assignments")
      .select(select)
      .eq("status", "accepted")
      .eq("match.status", "scheduled")
      .gte("match.starts_at", sarajevoToISO(tomorrow, "00:00"))
      .lt("match.starts_at", sarajevoToISO(dayAfter, "00:00")),
    // Poslane, a bez odgovora duže od 48 h, za utakmice koje tek dolaze
    supabase
      .from("assignments")
      .select(select)
      .eq("status", "pending")
      .lt("notified_at", new Date(now - PENDING_AFTER_HOURS * 3_600_000).toISOString())
      .eq("match.status", "scheduled")
      .gte("match.starts_at", new Date(now).toISOString()),
  ]);
  for (const r of [accepted, pending]) if (r.error) return Response.json({ error: r.error.message }, { status: 500 });

  // Već poslani podsjetnici, samo za ove nominacije (ne cijeli log)
  const candidateIds = [...(accepted.data ?? []), ...(pending.data ?? [])].map((a) => a.id);
  const alreadySent = candidateIds.length
    ? await supabase
        .from("email_log")
        .select("assignment_id, kind")
        .in("assignment_id", candidateIds)
        .in("kind", ["reminder", "pending_reminder"])
        .is("error", null)
    : { data: [], error: null };
  if (alreadySent.error) return Response.json({ error: alreadySent.error.message }, { status: 500 });

  // Svaki podsjetnik ide samo jednom po nominaciji
  const sent = new Set((alreadySent.data ?? []).map((e) => `${e.kind}:${e.assignment_id}`));
  let count = 0;

  for (const a of accepted.data ?? []) {
    if (!a.profile || sent.has(`reminder:${a.id}`)) continue;
    const ok = await sendEmail({
      to: a.profile.email,
      kind: "reminder",
      profileId: a.profile.id,
      assignmentId: a.id,
      ...reminderEmail(a.profile.full_name, a.position, a.match),
    });
    if (ok) count++;
  }
  for (const a of pending.data ?? []) {
    if (!a.profile || sent.has(`pending_reminder:${a.id}`)) continue;
    const ok = await sendEmail({
      to: a.profile.email,
      kind: "pending_reminder",
      profileId: a.profile.id,
      assignmentId: a.id,
      ...pendingReminderEmail(a.profile.full_name, a.position, a.match),
    });
    if (ok) count++;
  }

  return Response.json({ sent: count });
}
