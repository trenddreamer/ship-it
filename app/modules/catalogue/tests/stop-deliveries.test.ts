import { describe, expect, it } from "vitest";
import { createDueDeliveries, listVendorDueDeliveries } from "~/modules/deliveries";
import type { VendorStop } from "~/modules/subscriptions";
import { stopSelling } from "../index";
import { eggsWithSubscribers } from "./subscribed-eggs";

// Thandi gets eggs weekly and Sipho monthly, both from 1 November 2026: Thandi's
// fall due 2, 9, 16, 23 November..., Sipho's 2 November, 2 December...
async function dueAfterStopping(stop: (eggs: number) => VendorStop) {
  const { database, karoo, eggs } = await eggsWithSubscribers();
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
});
