"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Stranica starija od `seconds` se osvježi (server ponovo učita podatke): pri povratku u aplikaciju (otključan telefon,
 * aplikacija s početnog ekrana, drugi tab) i dok stoji otvorena i vidljiva (računar u kancelariji, telefon koji se ne
 * gasi). Bez ovoga ostavljena stranica satima prikazuje staro stanje (npr. tabelu prije novog kola). Unos u formama
 * ostaje (router.refresh ne briše stanje na klijentu).
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
    // Otvorena stranica: provjera svakih 15 s, osvježava se tek kad je starija od `seconds` (skrivena se preskače)
    const timer = window.setInterval(back, 15_000);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
      window.removeEventListener("pageshow", back);
      window.clearInterval(timer);
    };
  }, [seconds, router]);

  return null;
}
