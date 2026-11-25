import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const keyLength = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLength, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/**
 * A password as it is stored: `scrypt:<salt>:<key>`, both hex, with a fresh
 * random salt each time. The password itself is never stored.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

/**
 * Whether `password` is the one `stored` (from `hashPassword`) was hashed
 * from, compared in constant time.
 */
export async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [, salt, key] = stored.split(":");
  const actual = await derive(password, Buffer.from(salt!, "hex"));
  return timingSafeEqual(actual, Buffer.from(key!, "hex"));
}

/**
 * A real hash of no one's password. Checking a password against it when no
 * Account has the email takes as long as a real check, so the time a sign-in
 * takes doesn't reveal whether the email exists.
 */
export const decoyHash = await hashPassword(randomBytes(16).toString("hex"));
