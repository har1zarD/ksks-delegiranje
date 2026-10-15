"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { TeamName } from "@/components/team-name";
import { DateTile } from "@/components/match-line";
import { Button, CARD, cx, inputClass } from "@/components/ui";
import { formatKM, type PayrollMatch } from "@/lib/finance";
import { matchNo, POSITION_LABEL } from "@/lib/format";
import { setFees } from "../actions";
import { MarkAllPaid, PaidToggle } from "./paid-toggle";

/** "50,00" za polje (prazno kad nema ručne cijene) */
function toField(v: number | null) {
  return v == null ? "" : v.toFixed(2).replace(".", ",").replace(/,00$/, "");
}

/** Prazno = null (cijena iz pravila); inače KM ≥ 0 sa zarezom ili tačkom; undefined = neispravno */
function parseField(v: string): number | null | undefined {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 10000 ? Math.round(n * 100) / 100 : undefined;
}

/** Kartica utakmice u obračunu: klik na utakmicu otvara ručne cijene po osobi (prazno = po pravilu takmičenja) */
export function PayrollMatchCard({ match: m }: { match: PayrollMatch }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const open = () => {
    setValues(Object.fromEntries(m.items.map((i) => [i.assignmentId, i.custom ? toField(i.amount) : ""])));
    setError(undefined);
    setEditing(true);
  };

  const save = () => {
    const changed: { id: string; amount: number | null }[] = [];
    for (const i of m.items) {
      const amount = parseField(values[i.assignmentId] ?? "");
      if (amount === undefined) return setError("Iznosi moraju biti brojevi od 0 do 10.000 KM.");
      if (amount !== (i.custom ? i.amount : null)) changed.push({ id: i.assignmentId, amount });
    }
    if (changed.length === 0) return setEditing(false);
    start(async () => {
      const r = await setFees(changed);
      setError(r.error);
      if (!r.error) setEditing(false);
    });
  };

  return (
    <li className={cx(CARD, "flex flex-col p-4")}>
      <button
        type="button"
        onClick={() => (editing ? setEditing(false) : open())}
        aria-expanded={editing}
        title={editing ? "Zatvori cijene" : "Odredi cijene za ovu utakmicu"}
        className="group -m-2 flex items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-panel-2"
      >
        <DateTile iso={m.startsAt} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-fg-muted">
            <span className="font-semibold text-fg">{matchNo(m.number)}</span>, {m.competition}
            {m.kind && ` (${m.kind})`}
          </p>
          <div className="mt-1 flex flex-col gap-1 text-[15px] font-semibold">
            <TeamName name={m.home?.name ?? "Domaćin"} logoUrl={m.home?.club?.logo_url} />
            <TeamName name={m.away?.name ?? "Gost"} logoUrl={m.away?.club?.logo_url} />
          </div>
        </div>
        <Pencil className={cx("size-4 shrink-0 transition-colors", editing ? "text-fg" : "text-fg-faint group-hover:text-fg")} aria-hidden="true" />
      </button>

      {editing ? (
        <form
          className="mt-3 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <ul className="divide-y divide-line border-t border-line">
            {m.items.map((i) => (
              <li key={i.assignmentId} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{i.name}</span>
                  <span className="block truncate text-[12px] text-fg-muted">
                    {POSITION_LABEL[i.position]}, po pravilu {i.ruleAmount == null ? "bez cijene" : formatKM(i.ruleAmount)}
                  </span>
                </span>
                <div className="relative w-28 shrink-0">
                  <input
                    inputMode="decimal"
                    value={values[i.assignmentId] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [i.assignmentId]: e.target.value }))}
                    placeholder={toField(i.ruleAmount) || "—"}
                    aria-label={`Cijena: ${i.name}`}
                    className={cx(inputClass, "scoreboard pr-10 text-right text-[16px] font-semibold")}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-fg-faint">KM</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line pt-2 text-[12px] text-fg-faint">Prazno polje = cijena iz pravila takmičenja.</p>
          {error && (
            <p role="alert" className="pt-2 text-[13px] text-crest">
              {error}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Čuvam…" : "Sačuvaj cijene"}
            </Button>
            <Button type="button" variant="plain" disabled={pending} onClick={() => setEditing(false)}>
              Odustani
            </Button>
          </div>
        </form>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {m.items.map((i) => (
              <li key={i.assignmentId} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{i.name}</span>
                  <span className="block truncate text-[12px] text-fg-muted">
                    {POSITION_LABEL[i.position]}
                    {i.custom && ", ručna cijena"}
                  </span>
                </span>
                <span className={cx("scoreboard whitespace-nowrap text-[14px] font-semibold", i.amount == null && "text-[12px] text-orange")}>
                  {i.amount == null ? "bez cijene" : formatKM(i.amount)}
                </span>
                <PaidToggle id={i.assignmentId} paid={Boolean(i.paidAt)} />
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-fg-muted">
                Ukupno <span className="scoreboard font-semibold text-fg">{formatKM(m.total)}</span>
              </span>
              {m.unpaidCount === 0 && <span className="text-[12px] font-semibold text-mint">Sve isplaćeno</span>}
            </div>
            {/* Dugmad dijele red i ne izlaze iz kartice */}
            <div className="flex gap-2 empty:hidden">
              <MarkAllPaid ids={m.items.filter((i) => !i.paidAt).map((i) => i.assignmentId)} amount={m.unpaid} label="Isplati" className="flex-1" />
              <MarkAllPaid
                ids={m.items.filter((i) => i.paidAt).map((i) => i.assignmentId)}
                amount={m.paid}
                label="Poništi isplatu"
                paid={false}
                className="flex-1"
              />
            </div>
          </div>
        </>
      )}
    </li>
  );
}
