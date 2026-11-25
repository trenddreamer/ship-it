import { and, eq, isNull } from "drizzle-orm";
import {
  deliverySchedules,
  productDeliverySchedules,
  products,
  vendors,
  type DeliverySchedule,
} from "~/db/schema";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "~/modules/vendors";

/** A Product a Customer can subscribe to, with what they need to pick. */
export interface SubscribableProduct {
  id: number;
  name: string;
  description: string;
  vendorId: number;
  vendorName: string;
  /** Price per Delivery, in whole cents. */
  priceCents: number;
  /** Price per Delivery formatted for display, e.g. "R 150,00". */
  price: string;
  /** The Delivery Schedules it offers, in the fixed order: weekly, every two weeks, monthly. */
  deliverySchedules: DeliverySchedule[];
}

/**
 * The Product with this id, if Customers can subscribe to it: it exists and
 * its Vendor is approved. Otherwise null, as Customers can't see it.
 */
export async function findSubscribableProduct(
  database: MarketplaceDatabase,
  productId: number,
): Promise<SubscribableProduct | null> {
  const row = await database
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      vendorId: vendors.id,
      vendorName: vendors.name,
      priceCents: products.priceCents,
    })
    .from(products)
    .innerJoin(vendors, eq(vendors.id, products.vendorId))
    .where(
      and(
        eq(products.id, productId),
        isNull(products.stoppedOn),
        eq(vendors.approvalStatus, "approved"),
      ),
    )
    .get();
  if (!row) return null;
  const offered = await database
    .select({ deliverySchedule: productDeliverySchedules.deliverySchedule })
    .from(productDeliverySchedules)
    .where(eq(productDeliverySchedules.productId, productId))
    .all();
  const offeredSchedules = new Set(offered.map((o) => o.deliverySchedule));
  return {
    ...row,
    price: formatPrice(row.priceCents),
    deliverySchedules: deliverySchedules.filter((schedule) => offeredSchedules.has(schedule)),
  };
}
