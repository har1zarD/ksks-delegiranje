"use client";

import Image from "next/image";
import { useState } from "react";
import { Shield } from "lucide-react";
import { cx } from "@/components/ui";

export type TeamIdentity = {
  id?: string;
  name: string;
  club: { logo_url: string | null } | null;
};

export function ClubLogo({ src, eager = false }: { src?: string | null; eager?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <span aria-hidden="true" className="inline-flex h-8 w-12 shrink-0 items-center justify-center">
      {src && failedSrc !== src ? (
        <Image src={src} alt="" width={48} height={32} unoptimized loading={eager ? "eager" : "lazy"} className="size-full object-contain" onError={() => setFailedSrc(src)} />
      ) : (
        <Shield className="size-2/3 text-slate-400" strokeWidth={1.5} />
      )}
    </span>
  );
}

export function TeamName({ name, logoUrl, rank, className, wrap = false, eager = false }: {
  name: string;
  /** Pozicija na tabeli, diskretno desno od naziva */
  rank?: number | null;
  logoUrl?: string | null;
  className?: string;
  wrap?: boolean;
  eager?: boolean;
}) {
  return (
    <span className={cx("flex min-w-0 items-center gap-2", className)}>
      <ClubLogo src={logoUrl} eager={eager} />
      <span className={cx("min-w-0 max-w-full", wrap ? "break-words" : "truncate")} title={name}>{name}</span>
      {rank != null && (
        <span className="shrink-0 text-[0.72em] font-medium tabular-nums tracking-normal text-fg-faint" title={`${rank}. mjesto na tabeli`}>
          {rank}.
        </span>
      )}
    </span>
  );
}
