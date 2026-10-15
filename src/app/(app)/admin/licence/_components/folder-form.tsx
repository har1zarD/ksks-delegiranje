"use client";

import { useActionState, useState } from "react";
import { FolderPlus } from "lucide-react";
import { Select } from "@/components/select";
import { ClubLogo } from "@/components/team-name";
import { Button } from "@/components/ui";
import type { LicenseFolderOptions } from "@/lib/data/licenses";
import { createLicenseFolder, type LicenseState } from "../actions";

/** Novi folder: takmičenje pa klub (prvo klubovi koji u takmičenju imaju ekipu); čuvanje otvara folder */
export function FolderForm({ options, competitionId: fixed }: { options: LicenseFolderOptions; competitionId?: string }) {
  const [state, action, pending] = useActionState<LicenseState, FormData>(createLicenseFolder, {});
  const [competitionId, setCompetitionId] = useState(fixed ?? "");
  const [clubId, setClubId] = useState("");

  const inCompetition = new Set(options.competitions.find((c) => c.id === competitionId)?.clubIds ?? []);
  const teams = options.clubs.filter((c) => inCompetition.has(c.id));
  const others = options.clubs.filter((c) => !inCompetition.has(c.id));
  const option = (c: LicenseFolderOptions["clubs"][number]) => (
    <option key={c.id} value={c.id} data-icon={<ClubLogo src={c.logoUrl} />}>
      {c.name}
    </option>
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fixed ? (
          <input type="hidden" name="competition_id" value={fixed} />
        ) : (
          <Select
            label="Takmičenje"
            name="competition_id"
            value={competitionId}
            onChange={(e) => {
              setCompetitionId(e.target.value);
              setClubId("");
            }}
            required
          >
            <option value="" disabled>
              Izaberi takmičenje
            </option>
            {options.competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <Select label="Klub" name="club_id" value={clubId} onChange={(e) => setClubId(e.target.value)} required disabled={!competitionId} searchable>
          <option value="" disabled>
            Izaberi klub
          </option>
          {teams.length > 0 ? (
            <>
              <optgroup label="Igraju u takmičenju">{teams.map(option)}</optgroup>
              <optgroup label="Ostali klubovi">{others.map(option)}</optgroup>
            </>
          ) : (
            others.map(option)
          )}
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          <FolderPlus className="size-4" aria-hidden="true" />
          {pending ? "Pravim…" : "Napravi folder"}
        </Button>
        {state.error && (
          <p role="alert" className="text-[14px] text-crest">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
