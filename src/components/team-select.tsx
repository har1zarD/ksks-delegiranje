"use client";

import type { ChangeEventHandler } from "react";
import { ClubLogo } from "@/components/team-name";
import { Select } from "@/components/select";

/** Izbor ekipe ili kluba s logom uz svaku opciju (pretraga kad ih je više) */
export function TeamSelect({ label, name, options, defaultValue = "", onChange, placeholder = "Izaberi ekipu", allowNew = false, required = false }: {
  label: string;
  name: string;
  options: { id: string; name: string; logoUrl: string | null }[];
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  placeholder?: string;
  allowNew?: boolean;
  required?: boolean;
}) {
  return (
    <Select label={label} name={name} defaultValue={defaultValue} required={required} onChange={onChange}>
      <option value="" disabled>{placeholder}</option>
      {allowNew && <option value="new">Novi klub (van KSKS-a)</option>}
      {options.map((item) => (
        <option key={item.id} value={item.id} data-icon={<ClubLogo src={item.logoUrl} />}>
          {item.name}
        </option>
      ))}
    </Select>
  );
}
