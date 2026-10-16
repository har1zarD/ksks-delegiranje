import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Rate limit za javne ulaze (prijava, nova šifra, OAuth, MCP). Brojač je u bazi (rate_limit_hit), pa vrijedi za sve Vercel instance.

/** IP posjetioca. Vercel sam postavlja x-forwarded-for (klijent ga ne može podmetnuti). */
export function ipOf(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** IP posjetioca u Server Action-u */
export async function requestIp() {
  return ipOf(await headers());
}

/**
 * Broji pokušaj za ključ; false = limit prekoračen (max pokušaja u windowSeconds sekundi).
 * Greška baze ne blokira korisnike: bolje bez limita nego da niko ne može ući.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate_limit_hit", error.message);
    return true;
  }
  return data;
}

export const TOO_MANY = "Previše pokušaja. Sačekaj nekoliko minuta pa pokušaj ponovo.";
