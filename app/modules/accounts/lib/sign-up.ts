import { accounts, vendors } from "~/db/schema";
import { notifyAdmins } from "~/modules/notifications";
import type { MarketplaceDatabase } from "~/modules/vendors";
import { accountRowByEmail, toAccount, type Account } from "./account";
import { hashPassword } from "./password";
import type { CustomerSignUp, VendorSignUp } from "./schemas";

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

/**
 * Signs a visitor up as a Vendor: creates their Account and their Vendor
 * together, the Vendor pending until an Admin approves it, and tells every
 * Admin it is awaiting approval, all in one transaction. Refused, creating
 * nothing, when the email already has an Account.
 */
export async function signUpVendor(
  database: MarketplaceDatabase,
  input: VendorSignUp,
): Promise<SignUpResult> {
  if (await accountRowByEmail(database, input.email)) return { ok: false, error: "email-taken" };
  const passwordHash = await hashPassword(input.password);
  const row = await database.transaction(async (tx) => {
    const vendor = await tx
      .insert(vendors)
      .values({ name: input.businessName, description: input.description })
      .returning({ id: vendors.id })
      .get();
    const account = await tx
      .insert(accounts)
      .values({ email: input.email, passwordHash, kind: "vendor", vendorId: vendor.id })
      .returning()
      .get();
    await notifyAdmins(tx, { kind: "vendor-awaiting-approval", vendorName: input.businessName });
    return account;
  });
  return { ok: true, account: toAccount(row) };
}
