import { eq } from "drizzle-orm";
import { accounts } from "~/db/schema";
import type { MarketplaceDatabase } from "~/modules/vendors";
import { accountRowByEmail } from "./account";
import { hashPassword } from "./password";

/** The first Admin's email and password, from configuration. */
export interface FirstAdmin {
  email: string;
  password: string;
}

/**
 * Nobody signs up as an Admin. When no Admin exists, this creates one from
 * configuration; once any Admin exists it does nothing. Throws when the
 * configured email already belongs to a Customer or Vendor.
 */
export async function ensureFirstAdmin(
  database: MarketplaceDatabase,
  admin: FirstAdmin,
): Promise<"created" | "exists"> {
  const existing = await database
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.kind, "admin"))
    .get();
  if (existing) return "exists";
  if (await accountRowByEmail(database, admin.email)) {
    throw new Error(
      `Can't create the first Admin: ${admin.email} already has an Account. Configure another email.`,
    );
  }
  await database
    .insert(accounts)
    .values({
      email: admin.email,
      passwordHash: await hashPassword(admin.password),
      kind: "admin",
    })
    .run();
  return "created";
}
