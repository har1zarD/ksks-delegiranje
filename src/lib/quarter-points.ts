// Bodovi četvrtina (Minibasket): rezultat utakmice je zbir bodova po četvrtinama, ne zbir koševa.
// Dobijena četvrtina 1 bod, neriješena 0,5 svakoj ekipi, izgubljena 0. Kad je nakon 4 četvrtine neriješeno (2:2),
// ekipa s više ukupnih koševa dobija još 1 bod (npr. koševi 23:25 → 2:3). Konačni rezultat se zaokružuje naviše
// (2,5 : 1,5 → 3 : 2; korisnik, 21.11.2026.). Isto pravilo imaju okidači sync_match_score i round_youth_score.
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

/** Rezultat utakmice iz koševa po četvrtinama (broje se 4 regularne četvrtine); neriješeno nakon 4 četvrtine odlučuju ukupni koševi (+1 bod), zbir se zaokružuje naviše */
export function quarterPoints(periods: { home: number; away: number }[]) {
  const regular = periods.slice(0, 4);
  const total = regular.reduce(
    (t, p) => {
      const q = quarterPoint(p.home, p.away);
      return { home: t.home + q.home, away: t.away + q.away };
    },
    { home: 0, away: 0 },
  );
  const baskets = regular.reduce((d, p) => d + p.home - p.away, 0);
  const decider = regular.length === 4 && total.home === total.away && baskets !== 0;
  return {
    home: Math.ceil(total.home + (decider && baskets > 0 ? 1 : 0)),
    away: Math.ceil(total.away + (decider && baskets < 0 ? 1 : 0)),
  };
}

/** Rezultat za prikaz: polovine s decimalnim zarezom (2.5 → "2,5") */
export function formatScore(n: number) {
  return String(n).replace(".", ",");
}
