"use client";

import { confirm, type ConfirmOptions } from "@/components/confirm";
import { buttonClass } from "@/components/ui";

/** Submit dugme za nepovratne radnje: traži potvrdu u KSKS prozoru prije slanja forme. `label` = naziv za ikonu bez teksta. */
export function ConfirmButton({
  title,
  message,
  confirmLabel,
  children,
  variant = "destructive",
  className,
  label,
}: Omit<ConfirmOptions, "tone"> & {
  children: React.ReactNode;
  variant?: "destructive" | "danger" | "secondary";
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        const button = e.currentTarget;
        void confirm({ title, message, confirmLabel, tone: "danger" }).then((ok) => ok && button.form?.requestSubmit(button));
      }}
      className={buttonClass(variant, className)}
    >
      {children}
    </button>
  );
}
