// Paginacija liste utakmica po danima: stranica ima cijele dane, dok ne skupi bar `size` utakmica (dan se nikad ne dijeli).

export function paginateDays<T>(days: [string, T[]][], size = 20) {
  const pages: [string, T[]][][] = [];
  let count = size;
  for (const d of days) {
    if (count >= size) {
      pages.push([]);
      count = 0;
    }
    pages[pages.length - 1].push(d);
    count += d[1].length;
  }
  return pages;
}

const shortDay = new Intl.DateTimeFormat("bs-BA", { day: "numeric", month: "short", timeZone: "UTC" });

/** "24. okt – 14. nov" (prvi i zadnji dan stranice) */
export function pageRange(page: [string, unknown[]][]) {
  const fmt = (day: string) => shortDay.format(new Date(`${day}T12:00:00Z`)).replace(/\.$/, "");
  const first = fmt(page[0][0]);
  const last = fmt(page[page.length - 1][0]);
  return first === last ? first : `${first} – ${last}`;
}

/** Tražena stranica iz URL-a (?strana=), ograničena na postojeće */
export function pageParam(value: unknown, count: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= count ? n : 1;
}
