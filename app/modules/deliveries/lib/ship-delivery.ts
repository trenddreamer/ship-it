import { and, eq, isNull } from "drizzle-orm";
import { deliveries, products, subscriptions, vendors } from "~/db/schema";
import { formatCalendarDate, type CalendarDate } from "~/modules/calendar";
import { chargeDelivery } from "~/modules/charges";
import { sendNotification } from "~/modules/notifications";
import { formatPrice } from "~/modules/price";
import type { MarketplaceDatabase } from "~/modules/vendors";

export type ShipResult = { ok: true } | { ok: false; error: ShipRefusal };

/**
 * Why marking shipped was refused: the Delivery isn't one of the Vendor's, or
 * it was marked shipped already (a Delivery ships, and is charged, once).
 */
export type ShipRefusal = "delivery-not-found" | "already-shipped";

/**
 * A Vendor marks one of their due Deliveries shipped on `today`. In the same
 * transaction the Customer is charged the Price the Delivery recorded, and
 * notified. A
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
      .select({
        customerId: subscriptions.accountId,
        dueOn: deliveries.dueOn,
        priceCents: deliveries.priceCents,
        productName: products.name,
        vendorName: vendors.name,
      })
      .from(deliveries)
      .innerJoin(subscriptions, eq(subscriptions.id, deliveries.subscriptionId))
      .innerJoin(products, eq(products.id, subscriptions.productId))
      .innerJoin(vendors, eq(vendors.id, products.vendorId))
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
    const charge = await chargeDelivery(tx, deliveryId, today);
    await sendNotification(tx, delivery.customerId, {
      kind: "delivery-shipped",
      vendorName: delivery.vendorName,
      productName: delivery.productName,
      dueOn: formatCalendarDate(delivery.dueOn),
      amount: formatPrice(charge.amountCents),
    });
    return { ok: true };
  });
}
