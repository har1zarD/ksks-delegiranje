import { z } from "zod";
import { invalidateFromRoute } from "@/lib/cache";
import { MATCH_SELECT } from "@/lib/data/selects";
import { assertCommissionerCanScore, commissionerCanSetStatus } from "@/lib/delegation";
import { ASSIGNMENT_STATUS_LABEL, POSITION_ORDER } from "@/lib/format";
import type { McpContext } from "../context";
import { defineTool, must, ToolError, uuidSchema } from "../define";
import { matchView, positionView } from "../view";

/** Admin vidi sve; komesar samo utakmice na koje je delegiran (bez otkazanih) */
async function assertCanSee(ctx: McpContext, matchId: string) {
  if (ctx.profile.role === "admin") return;
  const rows = must(
    await ctx.db
      .from("assignments")
      .select("id")
      .eq("match_id", matchId)
      .eq("profile_id", ctx.profile.id)
      .neq("status", "cancelled"),
  );
  if (rows.length === 0) throw new ToolError("Nisi delegiran na ovu utakmicu.");
}

export const getMatch = defineTool({
  name: "get_match",
  description: "Detalji utakmice: vrijeme, ekipe, dvorana, delegirani i rezultat po četvrtinama.",
  roles: ["admin", "commissioner"],
  input: { utakmica_id: uuidSchema },
  readOnly: true,
  async run({ utakmica_id }, ctx) {
    await assertCanSee(ctx, utakmica_id);
    const match = await ctx.db.from("matches").select(`${MATCH_SELECT}, notes`).eq("id", utakmica_id).maybeSingle();
    if (!match.data) throw new ToolError("Utakmica nije pronađena.");

    const [crew, periods] = await Promise.all([
      ctx.db
        .from("assignments")
        .select("position, status, decline_reason, profile:profiles!assignments_profile_id_fkey ( full_name, phone )")
        .eq("match_id", utakmica_id),
      ctx.db.from("match_periods").select("period, home_points, away_points").eq("match_id", utakmica_id).order("period"),
    ]);

    return {
      ...matchView(match.data),
      napomena: match.data.notes,
      delegirani: must(crew)
        .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
        .map((a) => ({
          ...positionView(a.position),
          ime: a.profile?.full_name,
          telefon: a.profile?.phone,
          status: ASSIGNMENT_STATUS_LABEL[a.status],
          razlog_odbijanja: a.decline_reason,
        })),
      cetvrtine: must(periods).map((p) => ({ cetvrtina: p.period, domaci: p.home_points, gosti: p.away_points })),
    };
  },
});

export const setPeriodScore = defineTool({
  name: "set_period_score",
  description:
    "Upiši poene u četvrtini (1–4, 5+ su produžeci). Ukupni rezultat se računa automatski. Komesar samo za svoju utakmicu i samo dok je u toku (status live; pošalji status live da je započneš, finished da je završiš).",
  roles: ["admin", "commissioner"],
  input: {
    utakmica_id: uuidSchema,
    cetvrtina: z.number().int().min(1).max(12),
    domaci: z.number().int().min(0).max(200).describe("Poeni domaćina u toj četvrtini"),
    gosti: z.number().int().min(0).max(200).describe("Poeni gosta u toj četvrtini"),
    status: z.enum(["live", "finished"]).optional().describe("live = utakmica u toku, finished = završena"),
  },
  async run({ utakmica_id, cetvrtina, domaci, gosti, status }, { db, profile }) {
    const current =
      profile.role === "admin"
        ? must(await db.from("matches").select("status").eq("id", utakmica_id).single()).status
        : await assertCommissionerCanScore(db, utakmica_id, profile.id);

    // Ista pravila kao web (set_match_status, can_score): komesar samo scheduled → live → finished,
    // rezultat samo dok je utakmica uživo
    let next = current;
    if (status === "live" && current !== "live") {
      if (profile.role !== "admin" && !commissionerCanSetStatus(current, "live")) {
        throw new ToolError("Utakmica se ne može započeti u ovom statusu.");
      }
      next = "live";
    }
    if (profile.role !== "admin" && next !== "live") {
      throw new ToolError("Rezultat se unosi dok je utakmica u toku (status live).");
    }
    // Više uzastopnih upisa (status, četvrtina, status): invalidira se i kad neki od njih pukne
    try {
      if (next !== current) must(await db.from("matches").update({ status: next }).eq("id", utakmica_id).select("id"));

      must(
        await db
          .from("match_periods")
          .upsert({
            match_id: utakmica_id,
            period: cetvrtina,
            home_points: domaci,
            away_points: gosti,
            updated_by: profile.id,
            updated_at: new Date().toISOString(),
          })
          .select("period"),
        "Četvrtina nije sačuvana.",
      );

      if (status === "finished" && next !== "finished") {
        if (profile.role !== "admin" && !commissionerCanSetStatus(next, "finished")) {
          throw new ToolError("Utakmica se ne može završiti u ovom statusu.");
        }
        must(await db.from("matches").update({ status: "finished", finished_by: profile.id }).eq("id", utakmica_id).select("id"));
      }
    } finally {
      invalidateFromRoute({ table: "match_periods", match: utakmica_id });
    }

    const m = must(await db.from("matches").select("home_score, away_score, status").eq("id", utakmica_id).single());
    return { rezultat: `${m.home_score ?? 0}:${m.away_score ?? 0}`, status: m.status };
  },
});

export const matchTools = [getMatch, setPeriodScore];
