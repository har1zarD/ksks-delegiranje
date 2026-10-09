import { z } from "zod";
import { MY_ASSIGNMENT_SELECT } from "@/lib/data/selects";
import { respondToNomination as respond } from "@/lib/delegation";
import { ASSIGNMENT_STATUS_LABEL, todayISO } from "@/lib/format";
import { dateSchema, defineTool, must, ToolError, uuidSchema } from "../define";
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
    const { status, notifyAdmins } = await respond(db, {
      assignmentId: nominacija_id,
      profileId: profile.id,
      accept: prihvati,
      reason: razlog,
    });
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
  description: "Moja najavljena odsustva od danas nadalje.",
  roles: [...DELEGATES],
  input: {},
  readOnly: true,
  async run(_args, { db, profile }) {
    return must(
      await db
        .from("unavailability")
        .select("id, from_date, to_date, reason")
        .eq("profile_id", profile.id)
        .gte("to_date", todayISO())
        .order("from_date"),
    );
  },
});

export const addUnavailability = defineTool({
  name: "add_unavailability",
  description: "Najavi odsustvo (dane kad nisam dostupan za delegiranje).",
  roles: [...DELEGATES],
  input: {
    od: dateSchema.describe("Prvi dan odsustva, YYYY-MM-DD"),
    do: dateSchema.optional().describe("Zadnji dan (uključivo); izostavi za jedan dan"),
    razlog: z.string().max(200).optional(),
  },
  async run({ od, do: to, razlog }, { db, profile }) {
    const end = to ?? od;
    if (end < od) throw new ToolError("Kraj ne može biti prije početka.");
    if (end < todayISO()) throw new ToolError("Odsustvo mora biti u budućnosti.");
    return must(
      await db
        .from("unavailability")
        .insert({ profile_id: profile.id, from_date: od, to_date: end, reason: razlog?.trim() || null })
        .select("id, from_date, to_date, reason")
        .single(),
    );
  },
});

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
