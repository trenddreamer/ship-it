// Test fixture: a fresh in-memory Marketplace database (from ~/db/fresh-database), and Accounts to send Notifications to.
import * as schema from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";

export { freshDatabase } from "~/db/fresh-database";

/** Adds an Account of this kind (a Vendor Account gets a Vendor too) and returns its id. */
export async function addAccount(
  database: MarketplaceDatabase,
  email: string,
  kind: schema.AccountKind,
): Promise<number> {
  const vendorId =
    kind === "vendor"
      ? (
          await database
            .insert(schema.vendors)
            .values({ name: email })
            .returning({ id: schema.vendors.id })
            .get()
        ).id
      : null;
  const row = await database
    .insert(schema.accounts)
    .values({ email, passwordHash: "not a real hash", kind, vendorId })
    .returning({ id: schema.accounts.id })
    .get();
  return row.id;
}
