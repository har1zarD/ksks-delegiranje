"use client";

import { useActionState } from "react";
import { Check as CheckIcon } from "lucide-react";
import { Button, cx } from "@/components/ui";
import type { FormState } from "./actions";

export { Select } from "@/components/ui";

/** Forma za server akciju s porukom o grešci; resetuje se nakon uspjeha (state.ok) */
export function ActionForm({
  action,
  submit,
  pendingLabel = "Čuvam…",
  success,
  variant = "primary",
  className,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submit: string;
  pendingLabel?: string;
  success?: string;
  variant?: "primary" | "secondary" | "plain" | "destructive";
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const inline = variant === "destructive" || variant === "plain";
  return (
    <form key={state.ok} action={formAction} className={cx("flex flex-col gap-4", className)}>
      {children}
      <div className={cx("flex flex-wrap items-center gap-3", inline && "justify-end")}>
        <Button type="submit" variant={variant} disabled={pending} className={inline ? undefined : "w-full sm:w-auto"}>
          {pending ? pendingLabel : submit}
        </Button>
        {state.error ? (
          <p role="alert" className="text-[14px] text-crest">
            {state.error}
          </p>
        ) : (
          success &&
          state.ok !== undefined && (
            <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-mint">
              <CheckIcon className="size-4" /> {success}
            </p>
          )
        )}
      </div>
    </form>
  );
}

/** Checkbox s velikom metom za dodir */
export function Check({ label, className, ...props }: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label
      className={cx(
        "flex min-h-12 cursor-pointer items-center gap-3 rounded-md bg-panel-2 px-3.5 py-2.5 text-[15px] font-medium",
        className,
      )}
    >
      <input type="checkbox" className="size-5 shrink-0 accent-[var(--brand)]" {...props} />
      {label}
    </label>
  );
}
