import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { MarketplaceDatabase } from "~/db/database";
import {
  deliverySchedules,
  productDeliverySchedules,
  products,
  type DeliverySchedule,
} from "~/db/schema";
import { productIdSchema } from "./product-params-schema";

/** A Delivery Schedule for one of the Vendor's Products to offer. */
export interface ScheduleOffer {
  productId: number;
  deliverySchedule: DeliverySchedule;
}

export type OfferScheduleResult = { ok: true } | { ok: false; error: OfferScheduleRefusal };

/**
 * Why the Vendor may not offer it: the Product isn't the Vendor's or it stopped
 * selling it, or the Product already offers that Delivery Schedule.
 */
export type OfferScheduleRefusal = "product-not-found" | "already-offered";

/** The add-a-schedule form: the Product id from the URL and the `schedule` picked. */
export const offerScheduleSchema = z
  .object({ productId: productIdSchema, schedule: z.enum(deliverySchedules) })
  .transform(({ productId, schedule }): ScheduleOffer => ({
    productId,
    deliverySchedule: schedule,
  }));

/**
 * A Vendor offers another Delivery Schedule for one of its Products, or
 * offers again one it stopped: Customers can subscribe on it, and switch to
 * it, from now on. Refused for a Product that isn't the Vendor's or that it
 * stopped selling, and for a schedule the Product already offers.
 */
export async function offerDeliverySchedule(
  database: MarketplaceDatabase,
  vendorId: number,
  offer: ScheduleOffer,
): Promise<OfferScheduleResult> {
  return database.transaction(async (tx): Promise<OfferScheduleResult> => {
    const product = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, offer.productId),
          eq(products.vendorId, vendorId),
          isNull(products.stoppedOn),
        ),
      )
      .get();
    if (!product) return { ok: false, error: "product-not-found" };
    const added = await tx
      .insert(productDeliverySchedules)
      .values({ productId: product.id, deliverySchedule: offer.deliverySchedule })
      .onConflictDoNothing()
      .returning({ productId: productDeliverySchedules.productId })
      .all();
    if (added.length === 0) return { ok: false, error: "already-offered" };
    return { ok: true };
  });
}
