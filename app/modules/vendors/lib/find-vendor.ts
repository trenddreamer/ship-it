import { eq } from "drizzle-orm";
import { vendors, type VendorApprovalStatus } from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";

export interface Vendor {
  id: number;
  name: string;
  description: string;
  approvalStatus: VendorApprovalStatus;
}

/** The Vendor with this id, whatever its approval status, or null when there is none. */
export async function findVendor(
  database: MarketplaceDatabase,
  id: number,
): Promise<Vendor | null> {
  const vendor = await database.select().from(vendors).where(eq(vendors.id, id)).get();
  return vendor ?? null;
}

/**
 * Whether a Vendor may act on the Marketplace: add Products, change a Price,
 * stop selling, ship Deliveries. A pending or approved Vendor may; a rejected
 * one may not (it may still read its Inbox). False when there is no such Vendor.
 */
export async function vendorMayAct(database: MarketplaceDatabase, id: number): Promise<boolean> {
  const vendor = await findVendor(database, id);
  return vendor !== null && vendor.approvalStatus !== "rejected";
}
