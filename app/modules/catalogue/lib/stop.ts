import { and, eq, isNull } from "drizzle-orm";
import { productDeliverySchedules, products } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { cancelForVendorStop, type VendorStop } from "~/modules/subscriptions";
import type { MarketplaceDatabase } from "~/modules/vendors";

export type StopResult = { ok: true; cancelled: number } | { ok: false; error: StopRefusal };

/**
 * Why stopping was refused: the Product isn't the Vendor's or is already
 * stopped, or it doesn't offer (or no longer offers) the Delivery Schedule.
 */
export type StopRefusal = "product-not-found" | "schedule-not-offered";

/**
 * A Vendor stops selling one of its Products (`deliverySchedule: null`), or
 * stops offering one of its Delivery Schedules, as of `today`, for good.
 * Stopping a Product's last schedule stops the Product, so it never offers
 * none. In the same transaction, every active Subscription the stop affects
 * is cancelled and each Customer is told why. Returns how many it cancelled.
 */
export async function stopSelling(
  database: MarketplaceDatabase,
  vendorId: number,
  stop: VendorStop,
  today: CalendarDate,
): Promise<StopResult> {
  return database.transaction(async (tx): Promise<StopResult> => {
    const product = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, stop.productId),
          eq(products.vendorId, vendorId),
          isNull(products.stoppedOn),
        ),
      )
      .get();
    if (!product) return { ok: false, error: "product-not-found" };
    if (stop.deliverySchedule !== null) {
      const offered = await tx
        .select({ deliverySchedule: productDeliverySchedules.deliverySchedule })
        .from(productDeliverySchedules)
        .where(eq(productDeliverySchedules.productId, product.id))
        .all();
      if (!offered.some((o) => o.deliverySchedule === stop.deliverySchedule)) {
        return { ok: false, error: "schedule-not-offered" };
      }
      if (offered.length > 1) {
        await tx
          .delete(productDeliverySchedules)
          .where(
            and(
              eq(productDeliverySchedules.productId, product.id),
              eq(productDeliverySchedules.deliverySchedule, stop.deliverySchedule),
            ),
          )
          .run();
        return { ok: true, cancelled: await cancelForVendorStop(tx, stop, today) };
      }
    }
    // The whole Product stops. Its schedules stay: it never offers none.
    await tx.update(products).set({ stoppedOn: today }).where(eq(products.id, product.id)).run();
    const cancelled = await cancelForVendorStop(
      tx,
      { productId: product.id, deliverySchedule: null },
      today,
    );
    return { ok: true, cancelled };
  });
}
