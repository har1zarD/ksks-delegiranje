import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("./", import.meta.url));
const read = (file) => JSON.parse(readFileSync(`${directory}${file}`, "utf8"));
const save = (file, data) => writeFileSync(`${directory}${file}`, JSON.stringify(data, null, 2) + "\n");
const manifest = read("manifest.json");
const before = read("clubs-before.json");
const mode = process.argv[2];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const isPng = (bytes) => bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";

if (mode === "--prepare") {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error("Missing Supabase configuration");
  const assets = manifest.map((item) => {
    const club = item.clubId ? before.find((club) => club.id === item.clubId) : null;
    const path = `2026-10-20/fiba/${item.slug}.png`;
    const logoUrl = club?.logo_url ?? `${base}/storage/v1/object/public/club-logos/${path}`;
    if (item.clubId && !club?.logo_url) throw new Error(`Missing existing logo: ${item.slug}`);
    const bytes = readFileSync(`${directory}${item.clubId ? `${item.slug}-reference.png` : item.file}`);
    if (!isPng(bytes)) throw new Error(`Invalid PNG: ${item.slug}`);
    return { ...item, path, logoUrl, generated: !item.clubId, sha256: hash(bytes), bytes: bytes.length };
  });
  save("assets.json", assets);
  const requests = assets.filter((item) => item.generated).map((item) => [
    `url = ${JSON.stringify(`${base}/storage/v1/object/club-logos/${item.path}`)}`,
    `header = ${JSON.stringify(`apikey: ${key}`)}`,
    'header = "Content-Type: image/png"',
    'header = "Cache-Control: max-age=31536000"',
    'request = "POST"',
    `data-binary = ${JSON.stringify(`@${directory}${item.file}`)}`,
    `output = ${JSON.stringify(`${directory}upload-${item.slug}.json`)}`,
  ].join("\n"));
  writeFileSync("/private/tmp/ksks-fiba-images-upload.curl", requests.join("\nnext\n"), { mode: 0o600 });
  mkdirSync(`${directory}public`, { recursive: true });
  const reads = assets.map((item) => [
    `url = ${JSON.stringify(item.logoUrl)}`,
    `output = ${JSON.stringify(`${directory}public/${item.slug}.png`)}`,
  ].join("\n"));
  reads.push([
    `url = ${JSON.stringify(`${base}/rest/v1/clubs?select=id,name,short_name,logo_url,city&order=name`)}`,
    `header = ${JSON.stringify(`apikey: ${key}`)}`,
    `output = ${JSON.stringify(`${directory}clubs-after.json`)}`,
  ].join("\n"));
  writeFileSync("/private/tmp/ksks-fiba-images-public.curl", reads.join("\nnext\n"), { mode: 0o600 });
  console.log(JSON.stringify({ existing: assets.filter((item) => !item.generated).length, uploads: requests.length }));
} else if (mode === "--verify") {
  const assets = read("assets.json");
  for (const asset of assets) {
    if (asset.generated) {
      const result = read(`upload-${asset.slug}.json`);
      if (result.Key !== `club-logos/${asset.path}`) throw new Error(`Upload not confirmed: ${asset.slug}`);
    }
    const bytes = readFileSync(`${directory}public/${asset.slug}.png`);
    if (!isPng(bytes) || hash(bytes) !== asset.sha256) throw new Error(`Public asset mismatch: ${asset.slug}`);
  }
  const after = read("clubs-after.json");
  for (const club of before) {
    const current = after.find((row) => row.id === club.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(club)) throw new Error(`Existing club changed: ${club.name}`);
  }
  const summary = {
    generatedAndUploaded: assets.filter((asset) => asset.generated).length,
    existingLogosPreserved: assets.filter((asset) => !asset.generated).length,
    publicImagesFetchedAndMatched: assets.length,
    fibaTeamNamesCovered: new Set(assets.flatMap((asset) => asset.aliases)).size,
    existingClubRecordsUnchanged: true,
    sourceReviewed: true,
    testsRun: false,
    buildRun: false,
    deployed: false,
    browserVerification: "Blocked: no connected browser; unauthenticated /fiba redirects to /prijava.",
  };
  save("verification.json", summary);
  console.log(JSON.stringify(summary, null, 2));
} else {
  throw new Error("Usage: --prepare or --verify");
}
