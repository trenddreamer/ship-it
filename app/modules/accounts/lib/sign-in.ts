import type { MarketplaceDatabase } from "~/db/database";
import { accountRowByEmail, toAccount, type Account } from "./account";
import { decoyHash, passwordMatches } from "./password";
import type { SignInInput } from "./schemas";

export type SignInResult =
  { ok: true; account: Account } | { ok: false; error: "wrong-credentials" };

/**
 * Signs in with an email and password. A wrong email and a wrong password
 * give the same result, so a caller can't tell which was wrong.
 */
export async function signIn(
  database: MarketplaceDatabase,
  input: SignInInput,
): Promise<SignInResult> {
  const row = await accountRowByEmail(database, input.email);
  const matches = await passwordMatches(input.password, row?.passwordHash ?? decoyHash);
  if (!row || !matches) return { ok: false, error: "wrong-credentials" };
  return { ok: true, account: toAccount(row) };
}
