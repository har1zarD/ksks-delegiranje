# KSKS Nominacije

Aplikacija Košarkaškog saveza Kantona Sarajevo za delegiranje sudija, zapisničkog stola i komesara na omladinske lige.

Stack: Next.js 16 (App Router, Cache Components) · Supabase (Auth, Postgres, Realtime) · Vercel · Gmail SMTP (nodemailer).

## Uloge

| Uloga | Šta radi |
|---|---|
| Admin (savez) | utakmice, delegiranje, slanje nominacija, ljudi, takmičenja, kotizacije, naknade |
| Sudija / zapisnički sto (`official`) | nominacije (prihvati/odbij), moje utakmice, odsustva, moje naknade |
| Komesar (`commissioner`) | sve kao sudija + rezultat po četvrtinama uživo i bilten utakmice |

## Postavljanje

### 1. Supabase
1. Napravi projekat (region: Frankfurt `eu-central-1`).
2. Poveži CLI s projektom i pusti migracije: `pnpm supabase login`, `pnpm supabase link --project-ref <ref>`, `pnpm supabase db push`. Zatim pokreni `supabase/seed.sql` (takmičenja, klubovi, ekipe) u SQL editoru. Svaka nova migracija ide kao novi fajl u `supabase/migrations/` pa `pnpm supabase db push`.
3. Authentication → Sign In / Providers → Email: **isključi "Allow new users to sign up"** (naloge pravi samo savez).
4. Project Settings → API: kopiraj URL, publishable i secret ključ.

### 2. Gmail
Google nalog → Sigurnost → potvrda u 2 koraka → App passwords → nova app šifra. Limit je oko 500 mailova dnevno.

### 3. Varijable okruženja
Kopiraj `.env.example` u `.env.local` i popuni:

| Varijabla | Opis |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase projekat |
| `SUPABASE_SECRET_KEY` | samo server: kreiranje korisnika, MCP, email log |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | slanje nominacija i obavijesti preko SMTP servisa (Brevo); Gmail put je isključen u kodu |
| `NEXT_PUBLIC_SITE_URL` | javna adresa (linkovi u emailovima i MCP) |
| `INITIAL_PASSWORD` | zajednička početna šifra novih naloga |

### 4. Ljudi
Popuni CSV po uzoru na `scripts/ljudi-primjer.csv` (uloga: `sudija`, `sto`, `sudija+sto`, `komesar`, `admin`):

```bash
npx tsx scripts/import-people.mts ljudi.csv          # provjera
npx tsx scripts/import-people.mts ljudi.csv --upisi  # upis
```

Kasnije se ljudi dodaju u aplikaciji: Admin → Ljudi. Svako mijenja šifru u Postavkama.

### 5. Vercel
1. Importuj repozitorij, root direktorij `web`.
2. Unesi varijable okruženja iz koraka 3 (`NEXT_PUBLIC_SITE_URL` = vercel.app adresa).

## Emailovi
- **Nominacija:** admin aktivira utakmicu; nominacija kola ide svima sa liste, objava izmjena po izboru svima ili samo delegiranima na utakmici (nova imena crveno).
- **Otkazivanje:** uklanjanje već poslane nominacije javlja osobi.
- **Odbijanje:** kad neko odbije ili otkaže dolazak, email ide svim adminima s linkom za zamjenu.
- **Pingaj (Pregled):** admin ručno šalje podsjetnik onima koji nisu odgovorili na nominaciju (prozor s izborom osoba); automatskih podsjetnika nema.

Svaki email (i neuspjeli) upisuje se u `email_log`, a kancelarija saveza dobija skrivenu kopiju svakog (osim linka za novu šifru).

## MCP
Svaki korisnik u Postavkama pravi lični token (prikazuje se jednom). Endpoint: `${NEXT_PUBLIC_SITE_URL}/api/mcp`, zaglavlje `Authorization: Bearer <token>`. Alati zavise od uloge; svaki poziv se bilježi u `mcp_audit`.

## Razvoj
```bash
pnpm install
npx tsc --noEmit && npx eslint src
```

Push na `main` automatski deploya na produkciju (Vercel).
