"use client";

import { cx } from "@/components/ui";
import type { Crew } from "@/lib/crew";

/**
 * Sastav ekipe: sudije, komesar, pomoćne sudije za stolom, statistika, digitalni zapisnik.
 * Kontrolisan (value/onChange); šalje se kao skrivena polja crew_* (čita ih crewFromForm).
 */
export function CrewEditor({ value, onChange }: { value: Crew; onChange: (c: Crew) => void }) {
  const set = (patch: Partial<Crew>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <CrewHiddenFields crew={value} />

      <Row label="Sudije">
        <Choice
          options={[
            { label: "Bez", active: !value.referees, onClick: () => set({ referees: false }) },
            { label: "2", active: value.referees && value.refereeCount === 2, onClick: () => set({ referees: true, refereeCount: 2 }) },
            { label: "3", active: value.referees && value.refereeCount === 3, onClick: () => set({ referees: true, refereeCount: 3 }) },
          ]}
        />
        <Toggle label="Komesar" on={value.commissioner} onClick={() => set({ commissioner: !value.commissioner })} />
      </Row>

      <Row label="Sto">
        <Toggle label={value.digital ? "Dig. zapisnik" : "Zapisnik"} on={value.scorer} onClick={() => set({ scorer: !value.scorer })} />
        <Toggle label="Pom. zapisnik" on={value.assistantScorer} onClick={() => set({ assistantScorer: !value.assistantScorer })} />
        <Toggle label="Glavno vrijeme" on={value.timer} onClick={() => set({ timer: !value.timer })} />
        <Toggle label="24/14" on={value.shotClock} onClick={() => set({ shotClock: !value.shotClock })} />
      </Row>

      <Row label="Statistika">
        <Choice
          options={([0, 1, 2] as const).map((n) => ({ label: String(n), active: value.stats === n, onClick: () => set({ stats: n }) }))}
        />
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-1 text-[14px] font-medium text-fg-muted hover:text-fg">
          <input
            type="checkbox"
            checked={value.digital}
            onChange={(e) => set({ digital: e.target.checked })}
            className="size-4 accent-[var(--brand)]"
          />
          Digitalni zapisnik
        </label>
      </Row>
    </div>
  );
}

/** Skrivena polja za formu */
export function CrewHiddenFields({ crew }: { crew: Crew }) {
  const b = (v: boolean) => (v ? "1" : "0");
  return (
    <>
      <input type="hidden" name="crew_referees" value={b(crew.referees)} />
      <input type="hidden" name="crew_referee_count" value={crew.refereeCount} />
      <input type="hidden" name="crew_commissioner" value={b(crew.commissioner)} />
      <input type="hidden" name="crew_scorer" value={b(crew.scorer)} />
      <input type="hidden" name="crew_assistant_scorer" value={b(crew.assistantScorer)} />
      <input type="hidden" name="crew_timer" value={b(crew.timer)} />
      <input type="hidden" name="crew_shot_clock" value={b(crew.shotClock)} />
      <input type="hidden" name="crew_stats" value={crew.stats} />
      <input type="hidden" name="crew_digital" value={b(crew.digital)} />
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-24 shrink-0 text-[13px] font-semibold text-fg-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Choice({ options }: { options: { label: string; active: boolean; onClick: () => void }[] }) {
  return (
    <div role="radiogroup" className="inline-flex gap-0.5 rounded-lg bg-track p-[3px]">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={o.active}
          onClick={o.onClick}
          className={cx(
            "h-8 min-w-10 rounded-md px-3 text-[14px] font-semibold transition-colors",
            o.active ? "bg-panel-3 text-fg shadow-segment" : "text-fg-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "h-9 rounded-md border px-3 text-[14px] font-semibold transition-colors",
        on ? "border-transparent bg-brand text-brand-ink" : "border-line-strong bg-panel text-fg-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}
