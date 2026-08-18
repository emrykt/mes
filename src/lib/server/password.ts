import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Password hashing with Node's built-in scrypt — no native deps, works on
 * serverless. Format: `scrypt$<saltHex>$<hashHex>`. Legacy plain-text values
 * (from the earlier demo seed) are still accepted by verify() and upgraded to a
 * hash on the next successful login.
 */

const KEYLEN = 64;
const PREFIX = "scrypt$";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${PREFIX}${salt}$${hash}`;
}

export function isHashed(stored?: string | null): boolean {
  return !!stored && stored.startsWith(PREFIX);
}

export function verifyPassword(password: string, stored?: string | null): boolean {
  if (!stored) return false;
  if (!isHashed(stored)) return stored === password; // legacy plain (demo seed)
  const [, salt, hashHex] = stored.split("$");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, KEYLEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
