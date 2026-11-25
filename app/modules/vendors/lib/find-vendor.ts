import { eq } from "drizzle-orm";
import { vendors, type VendorApprovalStatus } from "~/db/schema";
import type { MarketplaceDatabase } from "./database";

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
