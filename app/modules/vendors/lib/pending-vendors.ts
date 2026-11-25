import { asc, eq } from "drizzle-orm";
import { vendors } from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";

export interface PendingVendor {
  id: number;
  name: string;
  description: string;
}

/** The Vendors awaiting an Admin's decision, oldest sign-up first. */
export async function listPendingVendors(database: MarketplaceDatabase): Promise<PendingVendor[]> {
  return database
    .select({ id: vendors.id, name: vendors.name, description: vendors.description })
    .from(vendors)
    .where(eq(vendors.approvalStatus, "pending"))
    .orderBy(asc(vendors.id))
    .all();
}
