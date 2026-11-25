// The Price a Delivery records when it falls due: the Product's Price as it
// stood 7 days before the due date, or when the Customer subscribed, if later.
import { describe, expect, it } from "vitest";
import { changePrice } from "~/modules/catalogue";
import { createDueDeliveries, listVendorDueDeliveries } from "../index";
import {
  addCustomer,
  addSubscription,
  addVendor,
  addVendorProduct,
  freshDatabase,
} from "./database";

/** Karoo Farm's eggs at R 150,00, which the Vendor can change. */
async function karooEggs() {
  const database = await freshDatabase();
  const karoo = await addVendor(database, "Karoo Farm");
  const eggs = await addVendorProduct(database, karoo, "Free-range eggs", { priceCents: 15000 });
  const setPrice = async (priceCents: number, today: string) => {
    const result = await changePrice(database, karoo, { productId: eggs, priceCents }, today);
    if (!result.ok) throw new Error(`changing the Price failed: ${result.error}`);
  };
  const subscribe = async (email: string, subscribedOn: string) =>
    addSubscription(database, await addCustomer(database, email), eggs, "weekly", subscribedOn);
  /** Every due Delivery's customer, due date and recorded Price, after the job runs `today`. */
  const recordedOn = async (today: string) => {
    await createDueDeliveries(database, today);
    return (await listVendorDueDeliveries(database, karoo)).map((d) => [
      d.customerEmail,
      d.dueOn,
      d.priceCents,
    ]);
  };
  return { setPrice, subscribe, recordedOn };
}

describe("the Price a Delivery records", () => {
  it("is the old Price for a Delivery due inside the 7 days after a change", async () => {
    const { setPrice, subscribe, recordedOn } = await karooEggs();
    await subscribe("thandi@example.test", "2026-11-01");

    await setPrice(16500, "2026-11-10");

    expect(await recordedOn("2026-11-16")).toEqual([
      ["thandi@example.test", "2026-11-02", 15000],
      ["thandi@example.test", "2026-11-09", 15000],
      ["thandi@example.test", "2026-11-16", 15000],
    ]);
  });

  it("is the new Price for a Delivery due exactly 7 days after the change, and later", async () => {
    const { setPrice, subscribe, recordedOn } = await karooEggs();
    await subscribe("thandi@example.test", "2026-11-01");

    await setPrice(16500, "2026-11-09");

    expect(await recordedOn("2026-11-23")).toEqual([
      ["thandi@example.test", "2026-11-02", 15000],
      ["thandi@example.test", "2026-11-09", 15000],
      ["thandi@example.test", "2026-11-16", 16500],
      ["thandi@example.test", "2026-11-23", 16500],
    ]);
  });

  it("is the new Price from the first Delivery for a Customer who subscribed after the change", async () => {
    const { setPrice, subscribe, recordedOn } = await karooEggs();

    await setPrice(16500, "2026-11-10");
    await subscribe("sipho@example.test", "2026-11-11");

    expect(await recordedOn("2026-11-19")).toEqual([
      ["sipho@example.test", "2026-11-12", 16500],
      ["sipho@example.test", "2026-11-19", 16500],
    ]);
  });

  it("orders subscribing and a change made on the same day as they happened", async () => {
    const { setPrice, subscribe, recordedOn } = await karooEggs();

    await subscribe("thandi@example.test", "2026-11-10");
    await setPrice(16500, "2026-11-10");
    await subscribe("sipho@example.test", "2026-11-10");

    expect(await recordedOn("2026-11-18")).toEqual([
      ["thandi@example.test", "2026-11-11", 15000],
      ["sipho@example.test", "2026-11-11", 16500],
      ["thandi@example.test", "2026-11-18", 16500],
      ["sipho@example.test", "2026-11-18", 16500],
    ]);
  });

  it("gives each of two changes in a row its own Notice Period", async () => {
    const { setPrice, subscribe, recordedOn } = await karooEggs();
    await subscribe("thandi@example.test", "2026-11-01");

    await setPrice(16500, "2026-11-08");
    await setPrice(18000, "2026-11-12");

    expect(await recordedOn("2026-11-23")).toEqual([
      ["thandi@example.test", "2026-11-02", 15000],
      ["thandi@example.test", "2026-11-09", 15000],
      ["thandi@example.test", "2026-11-16", 16500],
      ["thandi@example.test", "2026-11-23", 18000],
    ]);
  });
});
