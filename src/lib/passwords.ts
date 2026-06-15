import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const hashPrefix = "scrypt:v1";
const keyLength = 64;
const temporaryPasswordBytes = 9;

export async function verifyPassword(password: string, passwordHash: string) {
  const [prefix, version, saltHex, storedKeyHex] = passwordHash.split(":");

  if (`${prefix}:${version}` !== hashPrefix || !saltHex || !storedKeyHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(storedKeyHex, "hex");
  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;

  return `${hashPrefix}:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export function generateTemporaryPassword() {
  return randomBytes(temporaryPasswordBytes).toString("base64url");
}
