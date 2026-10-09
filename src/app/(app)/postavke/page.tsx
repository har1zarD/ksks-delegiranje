import { Suspense } from "react";
import { KeyRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, isoToSarajevo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/confirm-button";
import { cx, Loading, PageHeader, Panel, SectionTitle, Status } from "@/components/ui";
import { revokeToken } from "./actions";
import { PasswordForm } from "./password-form";
import { TokenForm } from "./token-form";

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
          <SectionTitle>AI asistent (MCP)</SectionTitle>
          <p className="-mt-1 mb-5 max-w-prose text-[15px] text-fg-muted">
            Lični token omogućava AI asistentu (npr. Claude) da u tvoje ime čita nominacije, odgovara na njih i najavljuje
            odsustva. Asistent ima ista prava kao ti. Token čuvaj kao šifru; ako procuri, opozovi ga.
          </p>
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
    .select("id, name, prefix, created_at, last_used_at, revoked_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  const mcpUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/mcp`;

  return (
    <div className="flex flex-col gap-4">
      <Panel className="py-4 sm:py-6">
        <TokenForm mcpUrl={mcpUrl} />
      </Panel>
      {tokens && tokens.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel [&>*]:px-4 sm:[&>*]:px-6">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-4">
              <KeyRound className={cx("size-5 shrink-0", t.revoked_at ? "text-fg-faint" : "text-gold")} strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <div className={cx("truncate text-[15px] font-semibold", t.revoked_at && "text-fg-faint line-through")}>
                  {t.name} <span className="font-normal text-fg-muted">{t.prefix}…</span>
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
                  <ConfirmButton message="Opozvati token? Asistent koji ga koristi više neće imati pristup.">Opozovi</ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
