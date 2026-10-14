"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Dok je neka utakmica uživo: promjena rezultata ili statusa osvježava stranicu (server ponovo učita podatke).
 * Više promjena zaredom (komesar upisuje četvrtinu) spaja se u jedno osvježavanje.
 */
export function LiveRefresh({ matchIds }: { matchIds: string[] }) {
  const router = useRouter();
  const key = matchIds.join(",");

  useEffect(() => {
    if (!key) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };
    const filter = `match_id=in.(${key})`;
    const channel = supabase
      .channel(`live:${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_periods", filter }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=in.(${key})` }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [key, router]);

  return null;
}
