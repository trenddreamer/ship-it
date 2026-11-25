import { and, eq, isNull } from "drizzle-orm";
import { products } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { cancelForVendorStop, type VendorStop } from "~/modules/subscriptions";
import type { MarketplaceDatabase } from "~/modules/vendors";

export type StopResult = { ok: true; cancelled: number } | { ok: false; error: StopRefusal };

/** Why stopping was refused: the Product isn't the Vendor's, or is already stopped. */
export type StopRefusal = "product-not-found";

/**
 * A Vendor stops selling one of its Products, as of `today`, for good.
 * Every active Subscription to it is cancelled in the same transaction.
 */
export async function stopSelling(
  database: MarketplaceDatabase,
  vendorId: number,
  stop: VendorStop,
  today: CalendarDate,
): Promise<StopResult> {
  return database.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ stoppedOn: today })
      .where(
        and(
          eq(products.id, stop.productId),
          eq(products.vendorId, vendorId),
          isNull(products.stoppedOn),
        ),
      )
      .run();
    const cancelled = await cancelForVendorStop(tx, stop, today);
    return { ok: true, cancelled };
  });
}
