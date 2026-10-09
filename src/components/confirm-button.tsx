"use client";

import { buttonClass } from "@/components/ui";

/** Submit dugme za nepovratne radnje: traži potvrdu prije slanja forme */
export function ConfirmButton({
  message,
  children,
  variant = "destructive",
  className,
}: {
  message: string;
  children: React.ReactNode;
  variant?: "destructive" | "danger";
  className?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={buttonClass(variant, className)}
    >
      {children}
    </button>
  );
}
