import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "/Users/harisvelic/Desktop/APP-KSKS/web/node_modules/@supabase/supabase-js/dist/index.mjs";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const dir = "output/club-logos-2026-10-23";
const jobs = [
  { name: "KK Lokomotiva", file: "lokomotiva-mostar.png", old: "2026-10-20/a2-jug/lokomotiva-mostar.jpg" },
  { name: "ŽKK Konjic", file: "zkk-konjic.png", old: "2026-10-22/zkk-konjic-pdf.jpg" },
];
const result = [];
for (const job of jobs) {
  const { data: club, error: e1 } = await db.from("clubs").select("id, name, logo_url").eq("name", job.name).single();
  if (e1) throw e1;
  if (!club.logo_url.endsWith(job.old)) throw new Error(`${job.name}: logo se promijenio u međuvremenu (${club.logo_url})`);
  const path = `2026-10-23/${job.file}`;
  const { error: e2 } = await db.storage.from("club-logos").upload(path, readFileSync(`${dir}/${job.file}`), { contentType: "image/png", upsert: true });
  if (e2) throw e2;
  const url = db.storage.from("club-logos").getPublicUrl(path).data.publicUrl;
  const { error: e3 } = await db.from("clubs").update({ logo_url: url }).eq("id", club.id);
  if (e3) throw e3;
  result.push({ club: club.name, id: club.id, before: club.logo_url, after: url });
}
writeFileSync(`${dir}/club-update-result.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
