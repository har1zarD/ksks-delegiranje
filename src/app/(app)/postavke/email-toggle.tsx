"use client";

import { useState } from "react";
import { setOnlyAssignedEmails } from "./actions";

const OPTIONS = [
  { value: false, label: "Sve nominacije", hint: "Nominaciju kola dobijaš uvijek, i kad nisi delegiran ni na jednu utakmicu." },
  { value: true, label: "Samo nominacije na kojima sam delegiran", hint: "Nominaciju kola dobijaš samo kad si delegiran na nekoj od utakmica u njoj." },
];

/** Koje nominacije kola osoba dobija emailom: izbor se odmah vidi i ostaje, čuva se u pozadini; vraća se samo ako čuvanje ne uspije */
export function EmailToggle({ value }: { value: boolean }) {
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState<string>();

  async function choose(next: boolean) {
    const prev = current;
    setCurrent(next);
    setError(undefined);
    const r = await setOnlyAssignedEmails(next);
    if (r.error) {
      setCurrent(prev);
      setError(r.error);
    }
  }

  return (
    <fieldset>
      <legend className="mb-3 text-[15px] font-semibold">Emailovi s nominacijama</legend>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((o) => (
          <label key={String(o.value)} className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="only_assigned_emails"
              checked={current === o.value}
              onChange={() => choose(o.value)}
              className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
            />
            <span>
              <span className="block text-[15px]">{o.label}</span>
              <span className="block text-[13px] text-fg-muted">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 pl-8 text-[13px] text-crest">
          {error}
        </p>
      )}
    </fieldset>
  );
}
