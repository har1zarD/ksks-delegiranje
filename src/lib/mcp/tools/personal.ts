import { after } from "next/server";
import { z } from "zod";
import { invalidateFromRoute } from "@/lib/cache";
import { MY_ASSIGNMENT_SELECT } from "@/lib/data/selects";
import { notifyAbsence } from "@/lib/emails";
import { respondToNomination as respond } from "@/lib/delegation";
import { absenceRange, ASSIGNMENT_STATUS_LABEL, formatAbsence } from "@/lib/format";
import { dateSchema, defineTool, must, timeSchema, ToolError, uuidSchema } from "../define";
import { matchView, positionView } from "../view";

const DELEGATES = ["official", "commissioner"] as const;

export const myNominations = defineTool({
  name: "my_nominations",
  description:
    "Moje nominacije za predstojeće utakmice (čekaju odgovor ili su prihvaćene). Vraća id nominacije potreban za respond_to_nomination.",
  roles: [...DELEGATES],
  input: {},
  readOnly: true,
  async run(_args, { db, profile }) {
    const rows = must(
      await db
        .from("assignments")
        .select(MY_ASSIGNMENT_SELECT)
        .eq("profile_id", profile.id)
        .in("status", ["pending", "accepted"])
        .not("notified_at", "is", null),
    );
    const now = new Date().toISOString();
    return rows
      .filter((a) => a.match && a.match.starts_at >= now)
      .sort((a, b) => a.match!.starts_at.localeCompare(b.match!.starts_at))
      .map((a) => ({
        nominacija_id: a.id,
        ...positionView(a.position),
        status: ASSIGNMENT_STATUS_LABEL[a.status],
        utakmica: matchView(a.match!),
      }));
  },
});

export const respondToNomination = defineTool({
  name: "respond_to_nomination",
  description:
    "Prihvati ili odbij svoju nominaciju. Odbijanje traži razlog. Već prihvaćena nominacija se može naknadno odbiti (otkazivanje dolaska).",
  roles: [...DELEGATES],
  input: {
    nominacija_id: uuidSchema.describe("id iz my_nominations"),
    prihvati: z.boolean().describe("true = prihvati, false = odbij"),
    razlog: z.string().max(500).optional().describe("Obavezno kod odbijanja"),
  },
  async run({ nominacija_id, prihvati, razlog }, { db, profile }) {
    const { status, matchId, notifyAdmins } = await respond(db, {
      assignmentId: nominacija_id,
      profileId: profile.id,
      accept: prihvati,
      reason: razlog,
    });
    invalidateFromRoute({ table: "assignments", match: matchId });
    await notifyAdmins();
    return { nominacija_id, status: ASSIGNMENT_STATUS_LABEL[status] };
  },
});

export const myMatches = defineTool({
  name: "my_matches",
  description: "Moje prihvaćene utakmice: predstojeće i odsuđene (s rezultatom).",
  roles: [...DELEGATES],
  input: {
    od: dateSchema.optional().describe("Od datuma (uključivo), YYYY-MM-DD"),
    do: dateSchema.optional().describe("Do datuma (uključivo), YYYY-MM-DD"),
  },
  readOnly: true,
  async run({ od, do: to }, { db, profile }) {
    const rows = must(
      await db.from("assignments").select(MY_ASSIGNMENT_SELECT).eq("profile_id", profile.id).eq("status", "accepted"),
    );
    const now = new Date().toISOString();
    const list = rows
      .filter((a) => a.match)
      .sort((a, b) => a.match!.starts_at.localeCompare(b.match!.starts_at))
      .map((a) => ({ upcoming: a.match!.starts_at >= now, ...positionView(a.position), utakmica: matchView(a.match!) }))
      .filter((a) => (!od || a.utakmica.datum >= od) && (!to || a.utakmica.datum <= to));
    const view = ({ pozicija, pozicija_naziv, utakmica }: (typeof list)[number]) => ({ pozicija, pozicija_naziv, utakmica });
    return {
      predstoje: list.filter((a) => a.upcoming).map(view),
      odsudjene: list.filter((a) => !a.upcoming).reverse().map(view),
    };
  },
});

export const listUnavailability = defineTool({
  name: "list_unavailability",
  description: "Moja najavljena odsustva koja još traju ili tek dolaze (od – do, sarajevsko vrijeme).",
  roles: [...DELEGATES],
  input: {},
  readOnly: true,
  async run(_args, { db, profile }) {
    const rows = must(
      await db
        .from("unavailability")
        .select("id, starts_at, ends_at, reason")
        .eq("profile_id", profile.id)
        .gt("ends_at", new Date().toISOString())
        .order("starts_at"),
    );
    return rows.map(absenceView);
  },
});

export const addUnavailability = defineTool({
  name: "add_unavailability",
  description:
    "Najavi odsustvo (period kad nisam dostupan za delegiranje). Bez vremena = cijeli dan; savez me u tom periodu ne vidi pri delegiranju.",
  roles: [...DELEGATES],
  input: {
    od: dateSchema.describe("Prvi dan odsustva, YYYY-MM-DD"),
    od_vrijeme: timeSchema.optional().describe("Od kad tog dana, HH:MM; izostavi za od početka dana"),
    do: dateSchema.optional().describe("Zadnji dan, YYYY-MM-DD; izostavi za isti dan"),
    do_vrijeme: timeSchema.optional().describe("Do kad tog dana, HH:MM; izostavi za do kraja dana"),
    razlog: z.string().max(200).optional(),
  },
  async run({ od, od_vrijeme, do: to, do_vrijeme, razlog }, { db, profile }) {
    const range = absenceRange({ from: od, fromTime: od_vrijeme, to, toTime: do_vrijeme });
    if ("error" in range) throw new ToolError(range.error);
    const created = must(
      await db
        .from("unavailability")
        .insert({ profile_id: profile.id, starts_at: range.startsAt, ends_at: range.endsAt, reason: razlog?.trim() || null })
        .select("id, starts_at, ends_at, reason")
        .single(),
    );
    invalidateFromRoute("unavailability");
    after(() => notifyAbsence({ profileId: profile.id, startsAt: created.starts_at, endsAt: created.ends_at, reason: created.reason }));
    return absenceView(created);
  },
});

function absenceView(a: { id: string; starts_at: string; ends_at: string; reason: string | null }) {
  return { id: a.id, period: formatAbsence(a.starts_at, a.ends_at), od: a.starts_at, do: a.ends_at, razlog: a.reason };
}

export const deleteUnavailability = defineTool({
  name: "delete_unavailability",
  description: "Ukloni svoje najavljeno odsustvo.",
  roles: [...DELEGATES],
  input: { id: uuidSchema.describe("id iz list_unavailability") },
  async run({ id }, { db, profile }) {
    const deleted = must(
      await db.from("unavailability").delete().eq("id", id).eq("profile_id", profile.id).select("id"),
    );
    if (deleted.length === 0) throw new ToolError("Odsustvo nije pronađeno.");
    invalidateFromRoute("unavailability");
    return { obrisano: id };
  },
});

export const personalTools = [
  myNominations,
  respondToNomination,
  myMatches,
  listUnavailability,
  addUnavailability,
  deleteUnavailability,
];
