// Entry point: what Customers see of Vendors and their Products.
import { findApprovedVendors, type ShownVendor } from "./lib/approved-vendors";
import type { MarketplaceDatabase } from "./lib/database";

export type { MarketplaceDatabase };

/**
 * The Vendors a Customer may see: every approved Vendor, each with its
 * Products and their Price per Delivery formatted in rands. Approved Vendors
 * without Products are included with an empty list.
 */
export function listApprovedVendors(database: MarketplaceDatabase): ShownVendor[] {
  return findApprovedVendors(database);
}
