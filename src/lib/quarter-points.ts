// Bodovi četvrtina (Minibasket): rezultat utakmice je zbir bodova po četvrtinama, ne zbir koševa.
// Dobijena četvrtina 1 bod, neriješena 0,5 svakoj ekipi, izgubljena 0. Isto pravilo ima okidač sync_match_score.
// Čista logika, bez Next/Supabase zavisnosti.

/** Takmičenja u kojima je rezultat utakmice zbir bodova četvrtina */
export function usesQuarterPoints(category: string | null | undefined) {
  return category === "minibasket";
}

/** Bodovi jedne četvrtine iz koševa */
export function quarterPoint(home: number, away: number) {
  if (home === away) return { home: 0.5, away: 0.5 };
  return home > away ? { home: 1, away: 0 } : { home: 0, away: 1 };
}

/** Rezultat utakmice iz koševa po četvrtinama (broje se 4 regularne četvrtine) */
export function quarterPoints(periods: { home: number; away: number }[]) {
  return periods.slice(0, 4).reduce(
    (t, p) => {
      const q = quarterPoint(p.home, p.away);
      return { home: t.home + q.home, away: t.away + q.away };
    },
    { home: 0, away: 0 },
  );
}

/** Rezultat za prikaz: polovine s decimalnim zarezom (2.5 → "2,5") */
export function formatScore(n: number) {
  return String(n).replace(".", ",");
}
