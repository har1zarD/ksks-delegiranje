import { Suspense } from "react";
import { ChevronDown, KeyRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, isoToSarajevo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/confirm-button";
import { cx, Loading, PageHeader, Panel, SectionTitle, Status } from "@/components/ui";
import { revokeToken } from "./actions";
import { PasswordForm } from "./password-form";
import { CopyBlock, TokenForm } from "./token-form";

export const metadata = { title: "Postavke — KSKS" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Postavke" />
      <div className="flex flex-col gap-12">
        <section>
          <SectionTitle>Šifra</SectionTitle>
          <p className="-mt-1 mb-5 text-[15px] text-fg-muted">Promijeni početnu šifru koju si dobio od saveza.</p>
          <Panel className="py-4 sm:py-6">
            <PasswordForm />
          </Panel>
        </section>

        <section>
          <SectionTitle>Poveži Claude</SectionTitle>
          <p className="-mt-1 mb-5 max-w-prose text-[15px] text-fg-muted">
            Claude (ili drugi AI asistent) može u tvoje ime raditi u KSKS-u: čitati nominacije, odgovarati na njih, najavljivati
            odsustva, a savez i delegirati. Ima ista prava kao ti i pristup možeš opozvati bilo kad.
          </p>
          <ConnectGuide />
        </section>

        <section>
          <SectionTitle>Povezani pristupi</SectionTitle>
          <Suspense fallback={<Loading />}>
            <Tokens />
          </Suspense>
        </section>
      </div>
    </>
  );
}

const date = (iso: string) => formatDate(isoToSarajevo(iso).date);

async function Tokens() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: tokens } = await supabase
    .from("mcp_tokens")
    .select("id, name, prefix, oauth_client_id, created_at, last_used_at, revoked_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      {(!tokens || tokens.length === 0) && (
        <p className="text-[15px] text-fg-muted">Još nema povezanih asistenata. Kad povežeš Claude, pojavit će se ovdje.</p>
      )}
      {tokens && tokens.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-panel [&>*]:px-4 sm:[&>*]:px-6">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-4">
              <KeyRound className={cx("size-5 shrink-0", t.revoked_at ? "text-fg-faint" : "text-brand")} strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <div className={cx("truncate text-[15px] font-semibold", t.revoked_at && "text-fg-faint line-through")}>
                  {t.name}{" "}
                  <span className="font-normal text-fg-muted">{t.oauth_client_id ? "connector" : `token ${t.prefix}…`}</span>
                </div>
                <div className="text-[13px] text-fg-muted">
                  Kreiran {date(t.created_at)}
                  {t.last_used_at ? `, zadnje korišten ${date(t.last_used_at)}` : ", još nije korišten"}
                </div>
              </div>
              {t.revoked_at ? (
                <Status tone="muted">Opozvan</Status>
              ) : (
                <form action={revokeToken}>
                  <input type="hidden" name="id" value={t.id} />
                  <ConfirmButton message="Opozvati pristup? Asistent koji ga koristi više neće moći raditi u KSKS-u.">Opozovi</ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const MCP_URL = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ksks-delegiranje.vercel.app"}/api/mcp`;

/** Koraci za povezivanje: Claude (web/desktop) preko custom connectora, Claude Code, ručni token */
function ConnectGuide() {
  return (
    <div className="flex flex-col gap-4">
      <Panel className="py-5 sm:py-6">
        <p className="text-[13px] font-medium text-fg-muted">Adresa KSKS servera</p>
        <CopyBlock text={MCP_URL} />

        <h3 className="mt-6 font-display text-[17px] font-semibold tracking-[-0.01em]">Claude (claude.ai ili Claude aplikacija)</h3>
        <ol className="mt-3 flex flex-col gap-2.5 text-[15px]">
          <Step n={1}>
            Otvori <b>Settings → Connectors</b> i klikni <b>Add custom connector</b>.
          </Step>
          <Step n={2}>
            Naziv: <b>KSKS</b>. Adresa: zalijepi adresu iznad. Klikni <b>Continue</b>.
          </Step>
          <Step n={3}>
            Ostavi <b>Sign in now</b> i <b>Register automatically</b> (Claude ih sam prepozna) i klikni <b>Add</b>.
          </Step>
          <Step n={4}>
            Kod KSKS connectora klikni <b>Connect</b>. Otvori se KSKS prijava: upiši email i šifru, pa klikni <b>Dozvoli</b>.
          </Step>
          <Step n={5}>
            Gotovo. U razgovoru uključi KSKS u meniju alata i piši npr. „Koje nominacije čekaju moj odgovor?”
          </Step>
        </ol>

        <h3 className="mt-6 font-display text-[17px] font-semibold tracking-[-0.01em]">Claude Code (terminal)</h3>
        <ol className="mt-3 flex flex-col gap-2.5 text-[15px]">
          <Step n={1}>Pokreni u terminalu:</Step>
        </ol>
        <CopyBlock text={`claude mcp add --transport http ksks ${MCP_URL}`} />
        <ol className="mt-3 flex flex-col gap-2.5 text-[15px]" start={2}>
          <Step n={2}>
            U Claude Code upiši <b>/mcp</b>, izaberi <b>ksks</b> i <b>Authenticate</b>. Prijava i <b>Dozvoli</b> idu u browseru.
          </Step>
        </ol>
      </Panel>

      <details className="group overflow-hidden rounded-lg border border-line bg-panel px-4 shadow-panel sm:px-6">
        <summary className="-mx-4 flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-panel-2 sm:-mx-6 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-semibold">Napredno: lični token</span>
            <span className="block text-[13px] text-fg-muted">Za alate koji ne podržavaju prijavu (zaglavlje Authorization: Bearer).</span>
          </span>
          <ChevronDown className="size-5 shrink-0 text-fg-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-line py-4 sm:py-5">
          <TokenForm mcpUrl={MCP_URL} />
        </div>
      </details>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="scoreboard w-5 shrink-0 text-right font-semibold text-fg-faint">{n}.</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
