import { randomInt } from "crypto";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE = /^[a-z2-9]{8}$/;

export function createDemoShareCode(): string {
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/** Stable public video link. Signed storage URLs are not accepted. */
export function lessonDemoVideoUrl(origin: string, code: string | null | undefined): string | null {
  if (!code || !CODE.test(code)) return null;
  const base = origin.trim().replace(/\/$/, "");
  if (!base.startsWith("https://")) return null;
  return `${base}/a/${code}`;
}
