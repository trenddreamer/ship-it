import { describe, expect, it } from "vitest";
import { addProduct, findVendorProduct, productParamsSchema, stopSelling } from "../index";
import { addVendor, freshDatabase } from "./database";

const eggs = {
  name: "Free-range eggs (30)",
  description: "A tray of 30 large eggs.",
  priceCents: 15000,
  deliverySchedules: ["weekly", "monthly"],
} as const;

describe("findVendorProduct", () => {
  it("finds one of the Vendor's Products, as the Vendor sees it", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm", "approved");
    const added = await addProduct(database, karoo, eggs, "2026-11-01");

    expect(await findVendorProduct(database, karoo, added.id)).toEqual(added);
  });

  it("finds no other Vendor's Product", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm", "approved");
    const other = await addVendor(database, "Other Farm", "approved");
    const added = await addProduct(database, karoo, eggs, "2026-11-01");

    expect(await findVendorProduct(database, other, added.id)).toBeNull();
    expect(await findVendorProduct(database, karoo, added.id + 1)).toBeNull();
  });

  it("finds no Product the Vendor stopped selling", async () => {
    const database = await freshDatabase();
    const karoo = await addVendor(database, "Karoo Farm", "approved");
    const added = await addProduct(database, karoo, eggs, "2026-11-01");
    await stopSelling(
      database,
      karoo,
      { productId: added.id, deliverySchedule: null },
      "2026-11-02",
    );

    expect(await findVendorProduct(database, karoo, added.id)).toBeNull();
  });
});

describe("productParamsSchema", () => {
  it("reads the Product id from a URL", () => {
    expect(productParamsSchema.parse({ productId: "7" })).toEqual({ productId: 7 });
  });

  it.each(["0", "-1", "1.5", "eggs", ""])("refuses %j as a Product id", (productId) => {
    expect(productParamsSchema.safeParse({ productId }).success).toBe(false);
  });
});
