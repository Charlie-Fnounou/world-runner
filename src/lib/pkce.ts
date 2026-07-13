import { randomBytes, createHash } from "node:crypto";

const CARACTERES_VERIFIER = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export function generarCodeVerifier(): string {
  const bytes = randomBytes(64);
  let resultado = "";
  for (const b of bytes) resultado += CARACTERES_VERIFIER[b % CARACTERES_VERIFIER.length];
  return resultado.slice(0, 64);
}

export function generarCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest("base64");
  return hash.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
