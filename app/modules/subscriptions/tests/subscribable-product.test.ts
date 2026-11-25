import { describe, expect, it } from "vitest";
import { findSubscribableProduct } from "../index";
import { addVendor, addVendorProduct, freshDatabase } from "./database";

describe("findSubscribableProduct", () => {
  it("gives an approved Vendor's Product with its Price and offered Delivery Schedules in order", async () => {
    const database = await freshDatabase();
    const { vendorId } = await addVendor(database, "Karoo Farm");
    const eggs = await addVendorProduct(database, vendorId, "Free-range eggs", {
      description: "A tray of 30.",
      priceCents: 6550,
      deliverySchedules: ["monthly", "weekly"],
    });
    await addVendorProduct(database, vendorId, "Lamb box", {
      deliverySchedules: ["every-two-weeks"],
    });

    expect(await findSubscribableProduct(database, eggs)).toEqual({
      id: eggs,
      name: "Free-range eggs",
      description: "A tray of 30.",
      vendorId,
      vendorName: "Karoo Farm",
      priceCents: 6550,
      price: "R 65,50",
      deliverySchedules: ["weekly", "monthly"],
    });
  });
});
