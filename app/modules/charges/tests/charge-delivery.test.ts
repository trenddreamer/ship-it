import { describe, expect, it } from "vitest";
import { chargeDelivery, listCustomerCharges } from "../index";
import {
  addCustomer,
  addSubscription,
  addVendor,
  addVendorProduct,
  freshDatabase,
  shipAllDue,
} from "./database";

describe("charging a Delivery", () => {
  it("never charges a Delivery twice, even if asked directly", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, karoo, "Free-range eggs");
    const thandi = await addCustomer(database, "thandi@example.test");
    await addSubscription(database, thandi, eggs, "weekly", "2026-11-01");
    await shipAllDue(database, karoo, "2026-11-02");
    const [charge] = await listCustomerCharges(database, thandi);

    // The only Delivery in a fresh database has id 1.
    await expect(chargeDelivery(database, 1, "2026-11-03")).rejects.toThrow();

    expect(await listCustomerCharges(database, thandi)).toEqual([charge]);
  });

  it("refuses a Delivery that doesn't exist", async () => {
    const database = await freshDatabase();

    await expect(chargeDelivery(database, 1, "2026-11-03")).rejects.toThrow(
      "Delivery 1 doesn't exist.",
    );
  });
});
