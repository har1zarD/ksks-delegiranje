import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const read = name => JSON.parse(readFileSync(`${dir}${name}.json`, "utf8"));
const save = (name, value) => writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2) + "\n");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error("Missing connection configuration.");
const api = async (path, init = {}) => {
  const res = await fetch(`${base}/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
};
const mode = process.argv[2];

if (mode === "--prepare") {
  if (existsSync(`${dir}licenses-insert.json`)) throw new Error("Import already prepared.");
  const club_id = "484c9753-58c1-4760-b30a-f886b4838b74", competition_id = "d74bc0b4-99f1-4313-8c15-463f76d06764";
  const before = await (await api(`rest/v1/licenses?select=id&club_id=eq.${club_id}`)).json();
  if (before.length) throw new Error("Existing licenses require reconciliation.");
  save("licenses-before", before);
  const team = await (await api(`rest/v1/teams?select=name,competition:competitions(name,season:seasons(name,is_current))&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (team.length !== 1 || team[0].name !== "Čelik" || team[0].competition.name !== "A2 liga jug KSBiH" || !team[0].competition.season.is_current) throw new Error("Team or competition mismatch.");
  const folder = await (await api(`rest/v1/license_folders?select=club_id&club_id=eq.${club_id}&competition_id=eq.${competition_id}`)).json();
  if (folder.length !== 1) throw new Error("License folder missing.");
  // [ime, prezime, datum rođenja, mjesto rođenja, visina, pozicija]
  const players = [
    ["Jasir", "Srebrenica", "2011-04-01", "Zenica", 192, "SG"],
    ["Edi", "Novalić", "2011-06-16", "Zenica", 190, "SF"],
    ["Affan", "Rizvanović", "2011-04-09", "Zenica", 191, "SF"],
    ["Eman", "Drino", "2008-05-24", "Zenica", 190, "SF"],
    ["Stefan", "Jovanović", "2008-08-31", "Zenica", 178, "SG"],
    ["Armin", "Dedić", "2008-11-29", "Zenica", 188, "SF"],
    ["Benjamin", "Drino", "2009-10-21", "Zenica", 195, "PF"],
    ["Aron", "Nussbaum", "2010-09-20", "Zenica", 188, "SF"],
    ["Ajnur", "Paučinac", "2011-01-23", "Zenica", 195, "PF"],
    ["Tarik", "Huseinbegović", "2006-05-01", "Zenica", 197, "C"],
    ["Armin", "Musaefendić", "2011-07-30", "Zenica", 185, "SG"],
    ["Kenan", "Hajdarević", "2011-09-17", "Zenica", 190, "SG"],
    ["Alen", "Bajramović", "2010-05-18", "Zenica", 188, "SG"],
    ["Rejjan", "Članjak", "2009-01-12", "Zenica", 187, "SG"],
    ["Amar", "Smriko", "2009-05-27", "Zenica", 192, "SF"],
    ["Arman", "Varešlija", "2010-09-04", "Zenica", 188, "SG"],
    ["Tarik", "Čamdžić", "2007-12-04", "Zenica", 204, "C"],
    ["Edvin", "Šišić", "2004-10-02", "Zenica", 192, "SF"],
    ["Ivan", "Jurić", "2008-10-30", "Zenica", 185, "SG"],
    ["Afan", "Busuladžić", "2009-04-17", "Bihać", 198, "SF"],
    ["Elman", "Odobašić", "2009-05-14", "Zenica", 187, "SG"],
    ["Novak", "Đerić", "2007-10-24", "Sokolac", 212, "C"],
  ];
  const officials = [
    ["Armel", "Mujaković", "Trener"],
    ["Armin", "Smajilović", "Trener"],
    ["Mustafa", "Halilić", "Trener"],
    ["Haris", "Bjelošević", "Trener"],
    ["Siniša", "Ignjatić", "Službeno lice"],
    ["Mirza", "Sikirić", "Službeno lice"],
  ];
  const records = [
    ...players.map(([first_name, last_name, birth_date, birth_place, height_cm, position], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "player", role: null,
      first_name, last_name, birth_date, birth_place, height_cm, position, license_no: null,
      photo_path: null, sort: i + 1,
    })),
    ...officials.map(([first_name, last_name, role], i) => ({
      id: randomUUID(), club_id, competition_id, kind: "official", role,
      first_name, last_name, birth_date: null, birth_place: null, height_cm: null, position: null, license_no: null,
      photo_path: null, sort: i + 1,
    })),
  ];
  if (records.length !== 28) throw new Error("Unexpected roster or photograph counts.");
  save("licenses-insert", records);
  save("manifest", {
    status: "prepared", club: "KK Čelik (OKK Čelik 2 Zenica)", team: "Čelik", competition: "A2 liga jug KSBiH", season: "2026/27", club_id, competition_id,
    source: "/Users/tarikvelic/Downloads/Celik/Spisak_za_licenciranje_A2_2026-27.pdf",
    notes: [
      "Roster from the signed, stamped PDF (OKK \"Čelik 2\" Zenica, verified by KS ZDK); DOC copy matches.",
      "Stored under KK Čelik, the club whose team plays A2 liga jug; its license folder already existed.",
      "Armin Dedić appears twice (rows 6 and 14, same birth date 29.11.2008, heights 188 and 191); one license created with row 6.",
      "Edvin Šišić: roster says 02.10.2004, the club's dual-license letter says born 2007; roster date used.",
      "Dual licenses per club letter 05-45/26: Ivan Jurić and Edvin Šišić (OKK Čelik), Afan Busuladžić (protected age), Novak Đerić (from OKK Čelik).",
      "Positions normalized: Bek → SG, Krilo → SF, Krilni centar → PF, Centar → C.",
      "Photos are in a Google Drive folder none of the user's accounts can access; licenses created without photos.",
      "No doctor or physiotherapist listed; license numbers blank.",
    ],
  });
  console.log(JSON.stringify({ players: players.length, official_licenses: officials.length }));
} else if (mode === "--import") {
  const manifest = read("manifest"), records = read("licenses-insert");
  if (manifest.status !== "prepared") throw new Error("Not in prepared state.");
  const res = await api("rest/v1/licenses", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(records) });
  save("licenses-insert-result", await res.json());
  manifest.status = "imported";
  save("manifest", manifest);
  console.log(`Inserted ${records.length} licenses.`);
} else if (mode === "--verify") {
  const manifest = read("manifest"), expected = read("licenses-insert");
  const actual = await (await api(`rest/v1/licenses?select=*&club_id=eq.${manifest.club_id}&order=kind,sort`)).json();
  save("licenses-after", actual);
  const own = actual.filter(r => r.competition_id === manifest.competition_id);
  if (own.length !== expected.length) throw new Error("Record count mismatch.");
  for (const r of expected) {
    const stored = own.find(a => a.id === r.id);
    if (!stored || Object.keys(r).some(k => stored[k] !== r[k])) throw new Error(`Record mismatch: ${r.first_name} ${r.last_name}`);
  }
  const result = {
    verified_at: new Date().toISOString(), club: manifest.club, competition: manifest.competition, season: manifest.season,
    players: own.filter(r => r.kind === "player").length, official_licenses: own.filter(r => r.kind === "official").length,
    all_fields_match: true,
  };
  save("verification", result);
  manifest.status = "imported_and_verified";
  save("manifest", manifest);
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use --prepare, --import or --verify.");
}
