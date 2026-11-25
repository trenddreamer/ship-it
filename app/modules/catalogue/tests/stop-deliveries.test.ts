import { describe, expect, it } from "vitest";
import { listCustomerCharges } from "~/modules/charges";
import { createDueDeliveries, listVendorDueDeliveries, shipDelivery } from "~/modules/deliveries";
import type { VendorStop } from "~/modules/subscriptions";
import { stopSelling } from "../index";
import { eggsWithSubscriptions } from "./subscribed-eggs";

// Thandi gets eggs weekly and Sipho monthly, both from 1 November 2026: Thandi's
// fall due 2, 9, 16, 23 November..., Sipho's 2 November, 2 December...
async function dueAfterStopping(stop: (eggs: number) => VendorStop) {
  const { database, karoo, eggs } = await eggsWithSubscriptions();
  await createDueDeliveries(database, "2026-11-10");

  await stopSelling(database, karoo, stop(eggs), "2026-11-20");
  // The job missed the 16th; it runs again long after the stop.
  await createDueDeliveries(database, "2026-12-31");

  const due = await listVendorDueDeliveries(database, karoo);
  return due.map((d) => `${d.customerEmail} ${d.dueOn}`);
}

describe("Deliveries when a Vendor stops", () => {
  it("stand when due before a Product stopped, and none fall due after", async () => {
    expect(await dueAfterStopping((productId) => ({ productId, deliverySchedule: null }))).toEqual([
      "thandi@example.test 2026-11-02",
      "sipho@example.test 2026-11-02",
      "thandi@example.test 2026-11-09",
      "thandi@example.test 2026-11-16",
    ]);
  });

  it("stand when due before a Delivery Schedule stopped, and others carry on", async () => {
    expect(
      await dueAfterStopping((productId) => ({ productId, deliverySchedule: "weekly" })),
    ).toEqual([
      "thandi@example.test 2026-11-02",
      "sipho@example.test 2026-11-02",
      "thandi@example.test 2026-11-09",
      "thandi@example.test 2026-11-16",
      "sipho@example.test 2026-12-02",
    ]);
  });

  it("can still be shipped and charged once the Product stopped", async () => {
    const { database, karoo, eggs, thandi } = await eggsWithSubscriptions();
    await createDueDeliveries(database, "2026-11-10");
    await stopSelling(database, karoo, { productId: eggs, deliverySchedule: null }, "2026-11-20");

    const [first] = await listVendorDueDeliveries(database, karoo);
    const shipped = await shipDelivery(database, karoo, first!.id, "2026-11-21");

    expect(shipped).toEqual({ ok: true });
    expect(await listCustomerCharges(database, thandi)).toMatchObject([
      { productName: "Free-range eggs", amountCents: 15000, chargedOn: "2026-11-21" },
    ]);
  });
});
