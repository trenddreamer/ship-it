import { accounts } from "~/db/schema";
import type { MarketplaceDatabase } from "~/modules/vendors";
import { accountRowByEmail, toAccount, type Account } from "./account";
import { hashPassword } from "./password";
import type { CustomerSignUp } from "./schemas";

export type SignUpResult = { ok: true; account: Account } | { ok: false; error: "email-taken" };

/** Signs a visitor up as a Customer. Refused when the email already has an Account. */
export async function signUpCustomer(
  database: MarketplaceDatabase,
  input: CustomerSignUp,
): Promise<SignUpResult> {
  if (await accountRowByEmail(database, input.email)) return { ok: false, error: "email-taken" };
  const row = await database
    .insert(accounts)
    .values({
      email: input.email,
      passwordHash: await hashPassword(input.password),
      kind: "customer",
    })
    .returning()
    .get();
  return { ok: true, account: toAccount(row) };
}
