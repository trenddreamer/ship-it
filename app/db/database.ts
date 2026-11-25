import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "~/db/schema";

/** Any Drizzle libSQL database over the Marketplace schema: the app's, or a test's. */
export type MarketplaceDatabase = LibSQLDatabase<typeof schema>;
