import { describe, expect, it } from "vitest";
import { listCustomerCharges } from "~/modules/charges";
import { createDueDeliveries, listVendorDueDeliveries, shipDelivery } from "../index";
import {
  addCustomer,
  addSubscription,
  addVendor,
  addVendorProduct,
  freshDatabase,
} from "./database";

async function karooWithDueEggs() {
  const database = await freshDatabase();
  const karoo = await addVendor(database, "Karoo Farm");
  const eggs = await addVendorProduct(database, karoo, "Free-range eggs", { priceCents: 9950 });
  const thandi = await addCustomer(database, "thandi@example.test");
  await addSubscription(database, thandi, eggs, "weekly", "2026-11-01");
  await createDueDeliveries(database, "2026-11-02");
  const [delivery] = await listVendorDueDeliveries(database, karoo);
  return { database, karoo, eggs, thandi, delivery: delivery! };
}

describe("shipping a Delivery", () => {
  it("charges the Customer the recorded Price, dated the day it was marked shipped", async () => {
    const { database, karoo, thandi, delivery } = await karooWithDueEggs();

    expect(await shipDelivery(database, karoo, delivery.id, "2026-11-04")).toEqual({ ok: true });

    expect(await listCustomerCharges(database, thandi)).toEqual([
      {
        id: expect.any(Number),
        productName: "Free-range eggs",
        vendorName: "Karoo Farm",
        amountCents: 9950,
        amount: "R 99,50",
        chargedOn: "2026-11-04",
      },
    ]);
  });

  it("refuses another Vendor's Delivery, and an unknown one, shipping and charging nothing", async () => {
    const { database, karoo, thandi, delivery } = await karooWithDueEggs();
    const coffee = await addVendor(database, "Cape Town Coffee Roasters");

    expect(await shipDelivery(database, coffee, delivery.id, "2026-11-04")).toEqual({
      ok: false,
      error: "delivery-not-found",
    });
    expect(await shipDelivery(database, karoo, delivery.id + 1, "2026-11-04")).toEqual({
      ok: false,
      error: "delivery-not-found",
    });

    expect(await listVendorDueDeliveries(database, karoo)).toMatchObject([{ id: delivery.id }]);
    expect(await listCustomerCharges(database, thandi)).toEqual([]);
  });

  it("refuses a second attempt, which charges nothing more", async () => {
    const { database, karoo, thandi, delivery } = await karooWithDueEggs();
    await shipDelivery(database, karoo, delivery.id, "2026-11-04");

    expect(await shipDelivery(database, karoo, delivery.id, "2026-11-05")).toEqual({
      ok: false,
      error: "already-shipped",
    });

    expect(await listCustomerCharges(database, thandi)).toMatchObject([
      { chargedOn: "2026-11-04" },
    ]);
  });
});
