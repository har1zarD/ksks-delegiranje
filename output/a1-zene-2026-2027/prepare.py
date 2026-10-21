import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
CID = "443667aa-44cf-4c3c-9934-5b3d426c8de4"

def read(name):
    return json.loads((OUT / (name + ".json")).read_text())

def save(name, data):
    (OUT / (name + ".json")).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

env = {}
for line in (ROOT / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        key, value = line.split("=", 1)
        env[key] = value.strip().strip('"').strip("'")
base = env["NEXT_PUBLIC_SUPABASE_URL"]
secret = env["SUPABASE_SECRET_KEY"]

def config(name, requests):
    blocks = []
    for path, output, method, payload, mime, prefer in requests:
        lines = ["url = " + json.dumps(base + "/" + path),
                 "header = " + json.dumps("apikey: " + secret),
                 "header = " + json.dumps("Authorization: Bearer " + secret)]
        if method:
            lines += ["request = " + json.dumps(method),
                      "header = " + json.dumps("Content-Type: " + mime),
                      "header = " + json.dumps("Prefer: " + prefer),
                      "data-binary = " + json.dumps("@" + str(OUT / payload))]
        lines += ["output = " + json.dumps(str(OUT / output)),
                  "write-out = " + json.dumps(output + ": %{http_code}\n")]
        blocks.append("\n".join(lines))
    dest = Path("/private/tmp/ksks-a1-" + name + ".conf")
    dest.write_text("\nnext\n".join(blocks) + "\n")
    dest.chmod(0o600)

competition = read("competition-before")
if len(competition) != 1 or competition[0]["category"] != "seniorke" or competition[0]["season"]["name"] != "2026/27":
    raise ValueError("Competition does not match the source season")
clubs = read("clubs-before")
if any("banovi" in (c["name"] + c["short_name"]).lower() for c in clubs):
    raise ValueError("Existing Banovići club needs reconciliation")
if (OUT / "club-insert.json").exists():
    new_club = read("club-insert")[0]
else:
    new_club = {"id": str(uuid.uuid4()), "name": "ŽKK RMU Banovići", "short_name": "RMU Banovići", "city": "Banovići", "active": True, "youth": False,
                "logo_url": base + "/storage/v1/object/public/club-logos/2026-10-21/a1-zene/rmu-banovici.png"}
    save("club-insert", [new_club])
clubs.append(new_club)
mapping = [
    ("StarTz", "KK StarTz"), ("Konjic", "KK Konjic"), ("Brčko Distrikt", "KK Brčko Distrikt"),
    ("Čelik", "KŽK Čelik"), ("Bugojno", "KK Bugojno"), ("Zenica", "KK Zenica"),
    ("Faze", "ŽKK Faze"), ("Play Off", "KK Play Off"), ("RMU Banovići", "ŽKK RMU Banovići"), ("G-Stars", "KK G-Stars"),
]
previous_teams = read("teams-before")
existing_folders = {f["club_id"] for f in read("folders-before")}
prepared = read("teams-upsert") if (OUT / "teams-upsert.json").exists() else []
teams, folders, manifest = [], [], []
for number, (name, club_name) in enumerate(mapping, 1):
    matches = [c for c in clubs if c["name"] == club_name]
    if len(matches) != 1 or not matches[0]["logo_url"]:
        raise ValueError("Missing club or logo: " + club_name)
    club = matches[0]
    team = next((t for t in previous_teams + prepared if t["name"] == name), None)
    if team and team["club_id"] != club["id"]:
        raise ValueError("Team belongs to a different club: " + name)
    row = {"id": team["id"] if team else str(uuid.uuid4()), "competition_id": CID, "club_id": club["id"], "name": name, "sort": number}
    teams.append(row)
    if club["id"] not in existing_folders:
        folders.append({"competition_id": CID, "club_id": club["id"]})
    manifest.append({**row, "club_name": club_name, "logo_url": club["logo_url"], "existing_licenses": sum(l["club_id"] == club["id"] for l in read("licenses-before"))})
save("teams-upsert", teams)
save("folders-insert", folders)
save("competition-update", {"starts_on": "2026-10-24"})
save("manifest", {"source": "/Users/tarikvelic/Downloads/A1 LIGA ZA KOŠARKAŠICE 2026-2027.pdf", "competition_id": CID, "teams": manifest, "rounds": 18, "fixtures": 90, "times_and_halls": "not provided; enter in schedule form", "new_empty_folders": len(folders)})
config("upload", [("storage/v1/object/club-logos/2026-10-21/a1-zene/rmu-banovici.png", "logo-upload-result.json", "POST", "rmu-banovici.png", "image/png", "return=representation")])
for name, table, payload, method, prefer in [
    ("club", "clubs", "club-insert.json", "POST", "return=representation"),
    ("teams", "teams?on_conflict=id", "teams-upsert.json", "POST", "resolution=merge-duplicates,return=representation"),
    ("folders", "license_folders?on_conflict=competition_id,club_id", "folders-insert.json", "POST", "resolution=ignore-duplicates,return=representation"),
    ("competition", "competitions?id=eq." + CID + "&starts_on=is.null", "competition-update.json", "PATCH", "return=representation"),
]:
    config(name, [("rest/v1/" + table, name + "-write-result.json", method, payload, "application/json", prefer)])
config("after", [("rest/v1/" + table + "?select=*&" + filt, name + "-after.json", None, None, None, None) for name, table, filt in [
    ("competition", "competitions", "id=eq." + CID),
    ("teams", "teams", "competition_id=eq." + CID + "&order=sort"),
    ("folders", "license_folders", "competition_id=eq." + CID),
    ("licenses", "licenses", "competition_id=eq." + CID),
    ("clubs", "clubs", "id=in.(" + ",".join(t["club_id"] for t in teams) + ")"),
    ("matches", "matches", "competition_id=eq." + CID),
]])
(OUT / "logos-public").mkdir(exist_ok=True)
config("logos", [(c["logo_url"].removeprefix(base + "/"), "logos-public/" + c["club_id"] + ".png", None, None, None, None) for c in manifest])
print(json.dumps({"teams": len(teams), "new_teams": len(teams) - len(previous_teams), "new_clubs": 1, "new_empty_folders": len(folders)}, ensure_ascii=False))
