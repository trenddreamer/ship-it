import { asc, eq, inArray } from "drizzle-orm";
import { products, vendors } from "~/db/schema";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "./database";

export interface ShownProduct {
  id: number;
  name: string;
  description: string;
  /** Price per Delivery in whole cents. */
  priceCents: number;
  /** Price per Delivery formatted for display, e.g. "R 150,00". */
  price: string;
}

export interface ShownVendor {
  id: number;
  name: string;
  description: string;
  products: ShownProduct[];
}

/**
 * The Vendors a Customer may see: every approved Vendor, each with its
 * Products and their Price per Delivery, ordered by name. Approved Vendors
 * without Products are included with an empty list. Pending and rejected
 * Vendors, and their Products, are never returned.
 */
export function listApprovedVendors(database: MarketplaceDatabase): ShownVendor[] {
  const approved = database
    .select({ id: vendors.id, name: vendors.name, description: vendors.description })
    .from(vendors)
    .where(eq(vendors.approvalStatus, "approved"))
    .orderBy(asc(vendors.name), asc(vendors.id))
    .all();
  if (approved.length === 0) return [];

  const rows = database
    .select()
    .from(products)
    .where(
      inArray(
        products.vendorId,
        approved.map((vendor) => vendor.id),
      ),
    )
    .orderBy(asc(products.name), asc(products.id))
    .all();

  const byVendor = new Map<number, ShownProduct[]>(approved.map((v) => [v.id, []]));
  for (const row of rows) {
    byVendor.get(row.vendorId)?.push({
      id: row.id,
      name: row.name,
      description: row.description,
      priceCents: row.priceCents,
      price: formatPrice(row.priceCents),
    });
  }

  return approved.map((vendor) => ({ ...vendor, products: byVendor.get(vendor.id) ?? [] }));
}
