"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Povratak u aplikaciju (otključan telefon, aplikacija s početnog ekrana, drugi tab): ako je stranica starija od
 * `seconds`, server ponovo učita podatke. Bez ovoga ostavljena stranica satima prikazuje staro stanje (npr. tabelu
 * prije novog kola). Unos u formama ostaje (router.refresh ne briše stanje na klijentu).
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const back = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < seconds * 1000) return;
      last = Date.now();
      router.refresh();
    };
    // pageshow: Safari vraća stranicu iz bfcache bez visibilitychange
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    window.addEventListener("pageshow", back);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
      window.removeEventListener("pageshow", back);
    };
  }, [seconds, router]);

  return null;
}
