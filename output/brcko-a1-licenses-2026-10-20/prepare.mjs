import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = "/Users/tarikvelic/Downloads/Slike A1";
const files = readdirSync(sourceDir);
const roster = [
  ["Mulić", "Amina", "2011-08-09", 168, "Amina Muli"],
  ["Vejzović", "Selma", "2016-07-26", 145, "Selma Vejzovi"],
  ["Mujkić", "Adna", "2010-04-24", 180, "Adna Mujki"],
  ["Čizmo", "Amina", "2013-04-29", 132, "Amina Žizmo"],
  ["Petinić", "Nadina", "2016-02-01", 156, "Nadina Petini"],
  ["Selimović", "Nadina", "2018-01-06", 139, "Nedina Selimovi"],
  ["Trobradović", "Lamija", "2017-11-29", 140, "Lamija Trobradovi"],
  ["Kukuljević", "Naida", "2017-08-30", 136, "Naida Kukuljevi"],
  ["Fazlović", "Ajša", "2015-05-19", 152, "Ajça Fazlovi"],
  ["Softić", "Nejla", "2009-01-26", 184, "Nejla Sofi"],
  ["Osmić", "Ajna", "2016-03-12", 143, "Ajna Osmi"],
  ["Livadić", "Lejla", "1999-04-15", 190, "Lejla Livadi"],
  ["Mehanović", "Lamija", "2011-01-03", 164, "Lamija Mehanovi"],
  ["Mahmutović", "Ajla", "2010-10-07", 182, "Ajla Mahmutovi"],
  ["Imšić", "Merjem", "2011-05-05", 173, "Merjem Imçi"],
];
const photos = [];
const players = roster.map(([last_name, first_name, birth_date, height_cm, prefix], i) => {
  const matches = files.filter(file => file.normalize("NFC").startsWith(prefix));
  if (matches.length !== 1) throw new Error(`Ambiguous photo: ${prefix}`);
  const file = matches[0];
  const source = `${sourceDir}/${file}`;
  const bytes = readFileSync(source);
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = bytes[0] === 255 && bytes[1] === 216;
  if ((!isPng && !isJpeg) || bytes.length > 5242880) throw new Error(`Unsupported photo: ${file}`);
  photos.push({
    sort: i + 1, first_name, last_name, source, file,
    content_type: isPng ? "image/png" : "image/jpeg",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
  });
  return {
    kind: "player", role: null, last_name, first_name, birth_date,
    birth_place: "Brčko", height_cm, position: null, license_no: null, sort: i + 1,
  };
});
const officials = [["Velagić", "Adem"], ["Cvijetinović", "Radenko"]].map(([last_name, first_name], i) => ({
  kind: "official", role: "Trener", last_name, first_name,
  birth_date: null, birth_place: null, height_cm: null, position: null,
  license_no: null, photo_path: null, sort: i + 1,
}));
if (new Set(photos.map(p => p.file)).size !== 15) throw new Error("Photo mapping is not one-to-one");
const manifest = {
  status: "prepared_not_imported",
  source: "/Users/tarikvelic/Downloads/SPISAK A1.pdf",
  club: "Brčko Distrikt", competition: "A1 liga žene", season: "2026/27",
  photos,
  notes: [
    "Names, dates and heights transcribed from visually reviewed PDF pages.",
    "All 15 birth places are Brčko; positions and license numbers are blank.",
    "Two coaches have no supplied photographs or birth details.",
    "Photo names contain encoding errors; source PDF spelling is retained.",
    "Amina Žizmo photo is mapped to Amina Čizmo from the PDF.",
    "Nedina Selimović photo is mapped to Nadina Selimović from the PDF.",
    "Nejla Sofić photo is mapped to Nejla Softić from the PDF.",
    "Club ID, current competition and existing licenses must be verified online before insertion.",
  ],
};
writeFileSync(`${dir}licenses-prepared.json`, JSON.stringify([...players, ...officials], null, 2) + "\n");
writeFileSync(`${dir}manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ status: manifest.status, players: players.length, officials: officials.length, photos: photos.length }));
