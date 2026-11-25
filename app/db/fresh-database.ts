// For tests: a fresh in-memory libSQL Marketplace database, migrated like the
// real one. Each module's tests/database.ts adds its own domain helpers.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { MarketplaceDatabase } from "./database";
import * as schema from "./schema";

export async function freshDatabase(): Promise<MarketplaceDatabase> {
  const database = drizzle({ client: createClient({ url: ":memory:" }), schema });
  await migrate(database, { migrationsFolder: "app/db/migrations" });
  return database;
}
