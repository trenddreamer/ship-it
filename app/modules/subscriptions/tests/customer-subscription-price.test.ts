import { describe, expect, it } from "vitest";
import { changePrice } from "~/modules/catalogue";
import { createDueDeliveries } from "~/modules/deliveries";
import { listCustomerSubscriptions, subscribe } from "../index";
import { addCustomer, addVendor, addVendorProduct, freshDatabase } from "./database";

/** Karoo Farm's eggs at R 150,00, and Thandi subscribed monthly on 1 October, next due 2 November. */
async function monthlyEggs() {
  const database = await freshDatabase();
  const { vendorId } = await addVendor(database, "Karoo Farm");
  const eggs = await addVendorProduct(database, vendorId, "Free-range eggs", { priceCents: 15000 });
  const thandi = await addCustomer(database, "thandi@example.test");
  await subscribe(database, thandi, { productId: eggs, deliverySchedule: "monthly" }, "2026-10-01");
  await createDueDeliveries(database, "2026-10-02");
  const priceOnList = async (customerId = thandi) => {
    const [subscription] = await listCustomerSubscriptions(database, customerId);
    return { priceCents: subscription!.priceCents, price: subscription!.price };
  };
  return { database, vendorId, eggs, thandi, priceOnList };
}

describe("the Price a Customer's Subscription shows", () => {
  it("is the old Price while the next Delivery falls due inside the Notice Period", async () => {
    const { database, vendorId, eggs, priceOnList } = await monthlyEggs();

    await changePrice(database, vendorId, { productId: eggs, priceCents: 18000 }, "2026-10-30");

    expect(await priceOnList()).toEqual({ priceCents: 15000, price: "R 150,00" });
  });

  it("is the new Price once the next Delivery falls due after the Notice Period", async () => {
    const { database, vendorId, eggs, priceOnList } = await monthlyEggs();

    await changePrice(database, vendorId, { productId: eggs, priceCents: 18000 }, "2026-10-26");

    expect(await priceOnList()).toEqual({ priceCents: 18000, price: "R 180,00" });
  });

  it("is the new Price at once for a Customer who subscribes after the change", async () => {
    const { database, vendorId, eggs, priceOnList } = await monthlyEggs();
    await changePrice(database, vendorId, { productId: eggs, priceCents: 18000 }, "2026-10-30");
    const sipho = await addCustomer(database, "sipho@example.test");

    await subscribe(database, sipho, { productId: eggs, deliverySchedule: "weekly" }, "2026-10-30");

    expect(await priceOnList(sipho)).toEqual({ priceCents: 18000, price: "R 180,00" });
  });
});
