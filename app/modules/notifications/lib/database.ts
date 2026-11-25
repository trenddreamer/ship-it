import type { ResultSet } from "@libsql/client";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "~/db/schema";

/**
 * The Marketplace database, or a transaction open on it. Pass the `tx` of
 * `database.transaction(async (tx) => ...)` to send a Notification in the
 * same transaction as the change it reports.
 */
export type DatabaseOrTransaction = BaseSQLiteDatabase<"async", ResultSet, typeof schema>;
