import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "~/db/schema";

/** Any Drizzle database over the Marketplace schema: the app's, or a test's. */
export type MarketplaceDatabase = BetterSQLite3Database<typeof schema>;
