import { and, eq, isNull } from "drizzle-orm";
import { productDeliverySchedules, products, type DeliverySchedule } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import type { DatabaseOrTransaction } from "~/modules/notifications";
import {
  cancelForVendorStop,
  countActiveSubscriptions,
  type VendorStop,
} from "~/modules/subscriptions";
import type { MarketplaceDatabase } from "~/modules/vendors";

export type StopResult = { ok: true; cancelled: number } | { ok: false; error: StopRefusal };

/**
 * Why stopping was refused: the Product isn't the Vendor's or is already
 * stopped, or it doesn't offer (or no longer offers) the Delivery Schedule.
 */
export type StopRefusal = "product-not-found" | "schedule-not-offered";

/** What a stop would do, for the Vendor to confirm. */
export interface StopPreview {
  productName: string;
  /** The Delivery Schedule that would stop; null when the whole Product would. */
  deliverySchedule: DeliverySchedule | null;
  /** How many active Subscriptions it would cancel. */
  activeSubscriptions: number;
}

/**
 * What stopping would do, before the Vendor confirms: which Product or
 * Delivery Schedule stops (stopping the last schedule stops the Product), and
 * how many active Subscriptions it would cancel. Null when `stopSelling`
 * would refuse it.
 */
export async function previewStop(
  database: MarketplaceDatabase,
  vendorId: number,
  stop: VendorStop,
): Promise<StopPreview | null> {
  const resolved = await resolveStop(database, vendorId, stop);
  if (!resolved.ok) return null;
  return {
    productName: resolved.productName,
    deliverySchedule: resolved.stop.deliverySchedule,
    activeSubscriptions: await countActiveSubscriptions(database, resolved.stop),
  };
}

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
    const resolved = await resolveStop(tx, vendorId, stop);
    if (!resolved.ok) return resolved;
    const { productId, deliverySchedule } = resolved.stop;
    if (deliverySchedule === null) {
      // Its schedules stay: a Product never offers none.
      await tx.update(products).set({ stoppedOn: today }).where(eq(products.id, productId)).run();
    } else {
      await tx
        .delete(productDeliverySchedules)
        .where(
          and(
            eq(productDeliverySchedules.productId, productId),
            eq(productDeliverySchedules.deliverySchedule, deliverySchedule),
          ),
        )
        .run();
    }
    return { ok: true, cancelled: await cancelForVendorStop(tx, resolved.stop, today) };
  });
}

type ResolvedStop =
  { ok: true; productName: string; stop: VendorStop } | { ok: false; error: StopRefusal };

/**
 * Checks a stop against the Vendor's catalogue, and turns stopping a
 * Product's last Delivery Schedule into stopping the Product.
 */
async function resolveStop(
  database: DatabaseOrTransaction,
  vendorId: number,
  stop: VendorStop,
): Promise<ResolvedStop> {
  const product = await database
    .select({ id: products.id, name: products.name })
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
  const wholeProduct = {
    ok: true,
    productName: product.name,
    stop: { productId: product.id, deliverySchedule: null },
  } as const;
  if (stop.deliverySchedule === null) return wholeProduct;
  const offered = await database
    .select({ deliverySchedule: productDeliverySchedules.deliverySchedule })
    .from(productDeliverySchedules)
    .where(eq(productDeliverySchedules.productId, product.id))
    .all();
  if (!offered.some((o) => o.deliverySchedule === stop.deliverySchedule)) {
    return { ok: false, error: "schedule-not-offered" };
  }
  if (offered.length === 1) return wholeProduct;
  return {
    ok: true,
    productName: product.name,
    stop: { productId: product.id, deliverySchedule: stop.deliverySchedule },
  };
}
