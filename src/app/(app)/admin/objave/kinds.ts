// Vrste slika i njihov URL parametar (?vrsta=). Poseban fajl jer ga čita i server stranica,
// a izvoz iz "use client" modula na serveru nije pravi niz.
export const SOCIAL_KINDS = [
  { id: "schedule", param: "raspored", label: "Raspored" },
  { id: "results", param: "rezultati", label: "Rezultati" },
  { id: "round", param: "kolo", label: "Kolo" },
  { id: "standings", param: "tabela", label: "Tabela" },
  { id: "clubs", param: "klubovi", label: "Klubovi" },
  { id: "stats", param: "statistika", label: "Statistika" },
] as const;
