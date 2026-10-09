import { createHash, randomBytes } from "node:crypto";

/** Novi lični token: "ksks_" + 32 nasumična bajta (base64url). U bazi se čuva samo SHA-256. */
export function generateToken() {
  const token = `ksks_${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token), prefix: token.slice(0, 8) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
