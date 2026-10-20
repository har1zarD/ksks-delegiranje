"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Podaci izvan naše baze (FIBA LiveStats): osvježavanje stranice svakih `seconds` dok je kartica vidljiva */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [seconds, router]);

  return null;
}
