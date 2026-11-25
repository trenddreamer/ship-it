import { describe, expect, it } from "vitest";
import { createDueDeliveries, listVendorDueDeliveries } from "../index";
import {
  addCustomer,
  addSubscription,
  addVendor,
  addVendorProduct,
  freshDatabase,
  homeAddress,
} from "./database";

describe("a Vendor's due Deliveries", () => {
  it("shows a Delivery once it falls due, with the Product, Customer and Delivery Address", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, karoo, "Free-range eggs", { priceCents: 9950 });
    const thandi = await addCustomer(database, "thandi@example.test");
    await addSubscription(database, thandi, eggs, "weekly", "2026-11-01");

    await createDueDeliveries(database, "2026-11-02");

    expect(await listVendorDueDeliveries(database, karoo)).toEqual([
      {
        id: expect.any(Number),
        dueOn: "2026-11-02",
        productName: "Free-range eggs",
        customerEmail: "thandi@example.test",
        deliveryAddress: homeAddress,
        priceCents: 9950,
        price: "R\u00a099,50",
      },
    ]);
  });
});
