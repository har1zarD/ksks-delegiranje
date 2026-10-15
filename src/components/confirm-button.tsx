"use client";

import { confirm, type ConfirmOptions } from "@/components/confirm";
import { buttonClass } from "@/components/ui";

/** Submit dugme za nepovratne radnje: traži potvrdu u KSKS prozoru prije slanja forme */
export function ConfirmButton({
  title,
  message,
  confirmLabel,
  children,
  variant = "destructive",
  className,
}: Omit<ConfirmOptions, "tone"> & {
  children: React.ReactNode;
  variant?: "destructive" | "danger";
  className?: string;
}) {
  return (
    <button
      type="submit"
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
