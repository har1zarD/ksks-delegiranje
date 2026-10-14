"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { createToken, type TokenState } from "./actions";

export function TokenForm({ mcpUrl }: { mcpUrl: string }) {
  const [state, action, pending] = useActionState<TokenState, FormData>(createToken, {});

  if (state.token) {
    const config = JSON.stringify(
      { mcpServers: { ksks: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${state.token}` } } } },
      null,
      2,
    );
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-amber/40 bg-panel px-4 py-4">
          <p className="text-[15px] font-semibold text-brand">Token je napravljen. Kopiraj ga sada, kasnije se više ne prikazuje.</p>
          <CopyBlock text={state.token} />
        </div>
        <div>
          <p className="text-[13px] font-medium text-fg-muted">Podešavanje za Claude (MCP server preko HTTP-a)</p>
          <CopyBlock text={config} />
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field label="Naziv tokena" name="name" maxLength={60} placeholder="Npr. Claude na laptopu" />
      <Button type="submit" disabled={pending}>
        {pending ? "Pravim…" : "Napravi token"}
      </Button>
      {state.error && (
        <p role="alert" className="text-[14px] text-crest sm:col-span-2">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md bg-panel-2 p-3">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed">{text}</pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }}
        className="grid size-10 shrink-0 place-items-center rounded-md text-brand hover:bg-panel-2"
        aria-label={copied ? "Kopirano" : "Kopiraj"}
        title={copied ? "Kopirano" : "Kopiraj"}
      >
        {copied ? <Check className="size-5 text-mint" /> : <Copy className="size-5" />}
      </button>
    </div>
  );
}
