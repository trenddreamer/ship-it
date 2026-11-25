import { describe, expect, it } from "vitest";
import { countUnread, openInbox } from "~/modules/notifications";
import { cancelSubscription, listCustomerSubscriptions } from "~/modules/subscriptions";
import { listApprovedVendors } from "~/modules/vendors";
import { addProduct, changePrice, listVendorProducts } from "../index";
import { addSubscriber, addVendor, freshDatabase } from "./database";

const eggs = {
  name: "Free-range eggs (30)",
  description: "A tray of 30 large eggs.",
  priceCents: 15000,
  deliverySchedules: ["weekly"],
} as const;

async function karooEggs() {
  const database = await freshDatabase();
  const karoo = await addVendor(database, "Karoo Farm", "approved");
  const product = await addProduct(database, karoo, eggs, "2026-11-01");
  return { database, karoo, productId: product.id };
}

describe("changePrice", () => {
  it("shows the new Price to the Vendor and to Customers straight away", async () => {
    const { database, karoo, productId } = await karooEggs();

    const result = await changePrice(
      database,
      karoo,
      { productId, priceCents: 16500 },
      "2026-11-10",
    );

    expect(result).toEqual({ ok: true, takesEffectOn: "2026-11-17" });
    expect(await listVendorProducts(database, karoo)).toMatchObject([
      { priceCents: 16500, price: "R 165,00" },
    ]);
    const [shown] = await listApprovedVendors(database);
    expect(shown?.products.map((p) => p.price)).toEqual(["R 165,00"]);
  });

  it("refuses another Vendor's Product, or one that doesn't exist, changing nothing", async () => {
    const { database, karoo, productId } = await karooEggs();
    const coffee = await addVendor(database, "Coffee Roasters", "approved");

    expect(await changePrice(database, coffee, { productId, priceCents: 1 }, "2026-11-10")).toEqual(
      {
        ok: false,
        error: "product-not-found",
      },
    );
    expect(
      await changePrice(database, karoo, { productId: productId + 1, priceCents: 1 }, "2026-11-10"),
    ).toEqual({ ok: false, error: "product-not-found" });
    expect(await listVendorProducts(database, karoo)).toMatchObject([{ priceCents: 15000 }]);
  });

  it("notifies every active subscriber of the old Price, the new one and when it takes effect", async () => {
    const { database, karoo, productId } = await karooEggs();
    const thandi = await addSubscriber(database, "thandi@example.test", productId, "2026-11-02");
    const sipho = await addSubscriber(database, "sipho@example.test", productId, "2026-11-03");

    await changePrice(database, karoo, { productId, priceCents: 16500 }, "2026-11-10");

    const message =
      "Karoo Farm changed the Price of Free-range eggs (30) from R 150,00 to R 165,00. " +
      "The new Price takes effect on 17 November 2026.";
    for (const customer of [thandi, sipho]) {
      const [notification] = await openInbox(database, customer);
      expect(notification?.message.replaceAll("\u00a0", " ")).toBe(message);
    }
  });

  it("doesn't notify a Customer who cancelled", async () => {
    const { database, karoo, productId } = await karooEggs();
    const thandi = await addSubscriber(database, "thandi@example.test", productId, "2026-11-02");
    const [subscription] = await listCustomerSubscriptions(database, thandi);
    await cancelSubscription(database, thandi, subscription!.id, "2026-11-05");

    await changePrice(database, karoo, { productId, priceCents: 16500 }, "2026-11-10");

    expect(await countUnread(database, thandi)).toBe(0);
  });

  it("refuses the Price the Product already has, notifying nobody", async () => {
    const { database, karoo, productId } = await karooEggs();
    const thandi = await addSubscriber(database, "thandi@example.test", productId, "2026-11-02");

    expect(
      await changePrice(database, karoo, { productId, priceCents: 15000 }, "2026-11-10"),
    ).toEqual({ ok: false, error: "same-price" });
    expect(await countUnread(database, thandi)).toBe(0);
  });
});
