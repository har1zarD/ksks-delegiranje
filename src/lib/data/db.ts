// Pomoćnici za keširane čitače. Greška baze se baca kao Error (nije keširana); null/prazno se vraća kao podatak.
type Res<T> = { data: T | null; error: { message: string } | null };

export function rows<T>(res: Res<T[]>): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

/** Za maybeSingle(): T već uključuje null */
export function row<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
