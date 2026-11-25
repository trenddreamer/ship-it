import { and, eq, isNull } from "drizzle-orm";
import { deliveries, products, subscriptions } from "~/db/schema";
import type { CalendarDate } from "~/modules/calendar";
import { chargeDelivery } from "~/modules/charges";
import type { MarketplaceDatabase } from "~/modules/vendors";

export type ShipResult = { ok: true } | { ok: false; error: ShipRefusal };

/**
 * Why marking shipped was refused: the Delivery isn't one of the Vendor's, or
 * it was marked shipped already (a Delivery ships, and is charged, once).
 */
export type ShipRefusal = "delivery-not-found" | "already-shipped";

/**
 * A Vendor marks one of their due Deliveries shipped on `today`. In the same
 * transaction the Customer is charged the Price the Delivery recorded. A
 * Delivery that fell due before its Subscription was cancelled still ships.
 */
export async function shipDelivery(
  database: MarketplaceDatabase,
  vendorId: number,
  deliveryId: number,
  today: CalendarDate,
): Promise<ShipResult> {
  return database.transaction(async (tx): Promise<ShipResult> => {
    const [delivery] = await tx
      .select({ id: deliveries.id })
      .from(deliveries)
      .innerJoin(subscriptions, eq(subscriptions.id, deliveries.subscriptionId))
      .innerJoin(products, eq(products.id, subscriptions.productId))
      .where(and(eq(deliveries.id, deliveryId), eq(products.vendorId, vendorId)))
      .all();
    if (!delivery) return { ok: false, error: "delivery-not-found" };
    // Conditional, so two attempts at once can't both ship it.
    const shipped = await tx
      .update(deliveries)
      .set({ shippedOn: today })
      .where(and(eq(deliveries.id, deliveryId), isNull(deliveries.shippedOn)))
      .run();
    if (shipped.rowsAffected === 0) return { ok: false, error: "already-shipped" };
    await chargeDelivery(tx, deliveryId, today);
    return { ok: true };
  });
}
