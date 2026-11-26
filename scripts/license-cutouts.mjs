// Fotografije igrača bez pozadine (PNG) za slike za objavu (MVP kola, petorka, lideri).
//   node scripts/license-cutouts.mjs              (A2 liga jug i A1 liga žene, samo igrači bez izrezane fotografije)
//   node scripts/license-cutouts.mjs --sve        (ponovo sve)
//   node scripts/license-cutouts.mjs <competition_id> …
// Samo macOS: osobu izrezuje Apple Vision (scripts/license-cutout.swift), lokalno, fotografija ne ide nikud van.
// PNG ide u bucket "licenses" kao <club_id>/cutout-<license_id>.png, putanja u licenses.cutout_path.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(existsSync(".env.local") ? ".env.local" : ".env");

const A2_JUG = "d74bc0b4-99f1-4313-8c15-463f76d06764";
const A1_ZENE = "443667aa-44cf-4c3c-9934-5b3d426c8de4";
const args = process.argv.slice(2);
const all = args.includes("--sve");
const competitions = args.filter((a) => /^[0-9a-f-]{36}$/i.test(a));

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const work = mkdtempSync(join(tmpdir(), "ksks-cutouts-"));
const tool = join(work, "license-cutout");
execFileSync("swiftc", ["-O", new URL("./license-cutout.swift", import.meta.url).pathname, "-o", tool], { stdio: "inherit" });

let query = db
  .from("licenses")
  .select("id, club_id, first_name, last_name, photo_path, cutout_path")
  .in("competition_id", competitions.length ? competitions : [A2_JUG, A1_ZENE])
  .eq("kind", "player")
  .not("photo_path", "is", null);
if (!all) query = query.is("cutout_path", null);
const { data: licenses, error } = await query;
if (error) throw error;
console.log(`${licenses.length} fotografija`);

let done = 0;
const failed = [];
for (const l of licenses) {
  const name = `${l.first_name} ${l.last_name}`;
  try {
    const { data: photo, error: downloadError } = await db.storage.from("licenses").download(l.photo_path);
    if (downloadError) throw downloadError;
    const source = join(work, `${l.id}.jpg`);
    const target = join(work, `${l.id}.png`);
    writeFileSync(source, Buffer.from(await photo.arrayBuffer()));
    execFileSync(tool, [source, target], { stdio: ["ignore", "ignore", "pipe"] });
    // Najviše 900 px po dužoj strani (dovoljno za 1080 px sliku, a PNG s prozirnošću ostaje mali). sips -Z i uvećava,
    // pa se manja slika ne dira (uvećana bi bila mutna i pikselizirana).
    const size = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", target], { encoding: "utf8" });
    const longest = Math.max(...[...size.matchAll(/pixel(?:Width|Height): (\d+)/g)].map((m) => Number(m[1])));
    if (longest > 900) execFileSync("sips", ["-Z", "900", target], { stdio: "ignore" });
    const path = `${l.club_id}/cutout-${l.id}.png`;
    const { error: uploadError } = await db.storage.from("licenses").upload(path, readFileSync(target), { contentType: "image/png", upsert: true });
    if (uploadError) throw uploadError;
    const { error: updateError } = await db.from("licenses").update({ cutout_path: path }).eq("id", l.id);
    if (updateError) throw updateError;
    done++;
    console.log(`✓ ${name} (${Math.round(statSync(target).size / 1024)} KB)`);
  } catch (cause) {
    failed.push(name);
    console.log(`✗ ${name}: ${cause instanceof Error ? cause.message : String(cause)}`.trim());
  }
}
rmSync(work, { recursive: true, force: true });
console.log(`Gotovo: ${done} izrezano${failed.length ? `, bez izreza (ostaje obična fotografija): ${failed.join(", ")}` : ""}`);
