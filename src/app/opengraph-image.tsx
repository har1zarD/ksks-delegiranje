import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

// OG slika (1200×630) za dijeljenje linka (Viber, WhatsApp, Facebook): grb saveza, naziv i adresa aplikacije.
// Crta se iz koda s pravim grbom i Geist fontom, pa je uvijek oštra i usklađena s aplikacijom.

export const alt = "KSKS Nominacije — Košarkaški savez Kantona Sarajevo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = (p: string) => readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), p));

export default async function OpenGraphImage() {
  const [logo, medium, bold] = await Promise.all([
    asset("public/brand/ksks-logo-1024.png"),
    asset("src/app/_og/Geist-500.woff"),
    asset("src/app/_og/Geist-700.woff"),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0b0c10 0%, #14161c 55%, #1a1420 100%)",
          fontFamily: "Geist",
          color: "#ffffff",
        }}
      >
        {/* Sjaj u bojama grba: crveno gore lijevo, plavo dolje desno */}
        <div style={{ position: "absolute", left: -140, top: -180, width: 640, height: 640, borderRadius: 999, background: "radial-gradient(circle, rgba(217,38,38,0.38) 0%, rgba(217,38,38,0) 65%)" }} />
        <div style={{ position: "absolute", right: -220, bottom: -280, width: 760, height: 760, borderRadius: 999, background: "radial-gradient(circle, rgba(66,72,170,0.40) 0%, rgba(66,72,170,0) 65%)" }} />
        {/* Traka u bojama grba */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 10, display: "flex" }}>
          <div style={{ width: "50%", height: "100%", background: "#b2322c" }} />
          <div style={{ width: "50%", height: "100%", background: "#3d3f8f" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 64, padding: "0 84px", width: "100%", height: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 344,
              height: 344,
              borderRadius: 56,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              flexShrink: 0,
            }}
          >
            <img src={logoSrc} width={264} height={264} alt="" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: 4, color: "rgba(255,255,255,0.58)" }}>KOŠARKAŠKI SAVEZ KANTONA SARAJEVO</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 14 }}>
              <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1, color: "rgba(255,255,255,0.72)" }}>KSKS</div>
              <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>Nominacije</div>
            </div>
            <div style={{ fontSize: 29, fontWeight: 500, color: "rgba(255,255,255,0.80)", marginTop: 24, lineHeight: 1.35, maxWidth: 640 }}>
              Nominacije sudija, pomoćnih sudija i komesara. Rezultati, bilteni i naknade na jednom mjestu.
            </div>
            <div style={{ display: "flex", marginTop: 40 }}>
              <div style={{ display: "flex", alignItems: "center", padding: "13px 24px", borderRadius: 999, background: "#ffffff", color: "#0b0c10", fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
                app.ksksarajevo.ba
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: medium, weight: 500, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
