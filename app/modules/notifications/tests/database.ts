// Test fixture: a fresh in-memory libSQL Marketplace database, migrated like
// the real one, and Accounts to send Notifications to.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";

export async function freshDatabase(): Promise<MarketplaceDatabase> {
  const database = drizzle({ client: createClient({ url: ":memory:" }), schema });
  await migrate(database, { migrationsFolder: "app/db/migrations" });
  return database;
}

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
