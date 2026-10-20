import { readFileSync, writeFileSync } from "node:fs";

const directory = new URL("./", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, directory), "utf8"));
const clubs = read("clubs-before.json");
const games = read("fiba_games-before.json");
const definitions = [
  ["realway", "KK Realway", ["AKADEMIJA REALWAY", "Realway", "KK Realway U14", "KK Realway U16", "REALWAY 1 U18", "REALWAY U14", "REALWAY U16", "REALWAY U18", "REALWAY WU13", "REALWAY WU14", "REALWAY WU16"]],
  ["bosna", "KK Bosna", ["BOSNA U18"]],
  ["bosnjak", "KK Bošnjak", ["Bošnjak"]],
  ["ceba", null, ["CEBA U18"]],
  ["celik", "KK Čelik", ["Celik"]],
  ["celik-zene", "KŽK Čelik", ["Celik BH Telecom"]],
  ["drina", "KK Drina", ["Drina Betin"]],
  ["gen", "KK GEN", ["GEN U18"]],
  ["gradina-srebrenik", "KK Gradina Srebrenik", ["Gradina S"]],
  ["gradina-tesanj", "KK Gradina Tešanj", ["Gradina Tesanj"]],
  ["siroki", "HKK Široki", ["HKK Siroki TT Kabeli", "ŠIROKI BRIJEG U18"]],
  ["zrinjski", "HKK Zrinjski 1992", ["HKK Zrinjski 1992"]],
  ["igman-istocna-ilidza", "OKK Igman", ["IGMAN IST. ILIDŽA U14", "IGMAN IST. ILIDŽA U16", "IGMAN IST. ILIDŽA WU14"]],
  ["ilidza", "KK Ilidža", ["ILIDŽA BLACK U14", "ILIDŽA U16", "ILIDŽA U18"]],
  ["igman-burch", "KK Igman Burch", ["Igman Burch", "Igman Burch U16", "Igman Burch U18", "KK Igman Burch U16", "IGMAN RICHMOND PARK U16", "IGMAN RICHMOND PARK U18", "Igman Richmond Park U18"]],
  ["jedinstvo", "ŽKK Jedinstvo", ["Jedinstvo"]],
  ["travnik", "KK Travnik", ["KK \"TRAVNIK\" TRAVNIK", "KK Travnik"]],
  ["zivinice", "KK Živinice", ["KK \"ZIVINICE\" ZIVINICE", "Zivinice"]],
  ["basket-zivinice", "KK Basket Živinice", ["KK Basket Zivinice"]],
  ["borac", "KK Borac", ["KK Borac WWIN"]],
  ["donji-vakuf", "KK Donji Vakuf Promo", ["KK Donji Vakuf", "KK Donji Vakuf Promo"]],
  ["gradacac", "KK Gradačac", ["KK Gradacac"]],
  ["jumper", "KK Jumper", ["KK Jumper"]],
  ["kos", "KK Koš", ["KK Koš U14", "KK Koš U16", "KK Koš u16", "KOŠ U16", "KOŠ U18"]],
  ["lavovi", null, ["KK Lavovi"]],
  ["leotar", "KK Leotar", ["KK Leotar"]],
  ["mladost-mrkonjic-grad", "KK Mladost Mrkonjić Grad", ["KK Mladost"]],
  ["orlovik", "KK Orlovik", ["KK Orlovik"]],
  ["radnicki", "KK Radnički", ["KK Radnicki"]],
  ["startz", "KK StarTz", ["KK STARTz"]],
  ["turbina", "KK Turbina", ["KK Turbina", "Turbina"]],
  ["vogosca", "KK Vogošća", ["KK Vogošća", "Vogosca", "VOGOŠĆA U18"]],
  ["kakanj", "KK Kakanj", ["Kakanj"]],
  ["konjic", "KK Konjic", ["Konjic"]],
  ["lider", null, ["LIDER"]],
  ["leotar-03", null, ["Leotar 03"]],
  ["marsonia", null, ["MARSONIA U18"]],
  ["mladost-ilijas", "KK Mladost", ["MLADOST ILIJAS WU14", "MLADOST WU16"]],
  ["mladi-krajisnik", null, ["Mladi Krajisnik"]],
  ["slavija", "OKK Slavija 1996", ["OKK Slavija 1996"]],
  ["sloboda", "OKK Sloboda", ["OKK Sloboda Energoinvest", "SLOBODA U16"]],
  ["spars", "KK Spars", ["OKK Spars U14", "OKK Spars U16", "SPARS U18", "Spars Number 1 U16", "Spars U18", "BOSNA-SPARS U18", "KK Bosna Spars"]],
  ["zenica", "KK Zenica", ["OKK Zenica"]],
  ["orlovi", null, ["Orlovi"]],
  ["play-off", "KK Play Off", ["PLAY OFF WU14", "PLAY OFF WU16", "Play Off"]],
  ["rilski-sportist", null, ["RILSKI SPORTIST U16"]],
  ["banovici", null, ["RMU Banovici"]],
  ["ius-famos", "KK IUS-Famos", ["UKK IUS FAMOS"]],
  ["zeljo-1971", "KK Željo 1971", ["Željo 1971"]],
];
const seen = new Set();
const references = {
  lavovi: "https://www.kklavovibrcko.com/wp-content/uploads/2016/01/grb_kk_lavovi.png",
  lider: "https://www.kklavovibrcko.com/wp-content/uploads/2024/03/KKLiderGradiskaGrb-500.png",
  "leotar-03": "https://www.kklavovibrcko.com/wp-content/uploads/2021/05/zkk-leotar-03-500.png",
  "mladi-krajisnik": "https://www.zkkmladikrajisnik.com/logo-tima/1550565733-logo.PNG",
  orlovi: "https://kkorlovi.net/files/osnovno/slike/orlovi.jpg",
};
const manifest = definitions.map(([slug, clubName, aliases]) => {
  const club = clubName ? clubs.find((club) => club.name === clubName) : null;
  if (clubName && !club) throw new Error(`Missing club: ${clubName}`);
  for (const alias of aliases) {
    if (seen.has(alias)) throw new Error(`Duplicate alias: ${alias}`);
    seen.add(alias);
  }
  const feedLogos = games.flatMap((game) => ["home", "away"].flatMap((side) =>
    aliases.includes(game[`${side}_name`]) && game[`${side}_logo`] ? [game[`${side}_logo`]] : []));
  return { slug, clubId: club?.id ?? null, clubName, aliases, referenceUrl: club?.logo_url ?? references[slug] ?? feedLogos[0] ?? null, file: `${slug}.png` };
});
const names = [...new Set(games.flatMap((game) => [game.home_name, game.away_name]))];
const missing = names.filter((name) => !seen.has(name));
if (missing.length) throw new Error(`Unmapped teams: ${missing.join(", ")}`);
writeFileSync(new URL("manifest.json", directory), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync("/private/tmp/ksks-fiba-images-references.curl", manifest.filter((item) => item.referenceUrl).map((item) =>
  `url = ${JSON.stringify(item.referenceUrl)}\noutput = ${JSON.stringify(new URL(`${item.slug}-reference.png`, directory).pathname)}`
).join("\nnext\n"));
console.log(JSON.stringify({ clubs: manifest.length, names: names.length, withoutReference: manifest.filter((item) => !item.referenceUrl).map((item) => item.slug) }));
