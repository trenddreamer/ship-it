// Test fixture: a fresh in-memory Marketplace database (from ~/db/fresh-database), plus small helpers to add Vendors and Products to it.
import * as schema from "~/db/schema";
import type { MarketplaceDatabase } from "~/db/database";

export { freshDatabase } from "~/db/fresh-database";

export async function addVendor(
  database: MarketplaceDatabase,
  name: string,
  approvalStatus: schema.VendorApprovalStatus,
  description = "",
): Promise<number> {
  const vendor = await database
    .insert(schema.vendors)
    .values({ name, approvalStatus, description })
    .returning({ id: schema.vendors.id })
    .get();
  return vendor.id;
}

export async function addProduct(
  database: MarketplaceDatabase,
  vendorId: number,
  name: string,
  priceCents: number,
  description = "",
): Promise<void> {
  await database.insert(schema.products).values({ vendorId, name, priceCents, description }).run();
}
