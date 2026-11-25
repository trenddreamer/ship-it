// Test fixture for stopping: a Vendor's Product, eggs, offered weekly and
// monthly, with one Customer subscribed on each schedule.
import { subscribe } from "~/modules/subscriptions";
import { addProduct } from "../index";
import { addCustomer, addVendor, freshDatabase } from "./database";

export async function eggsWithSubscribers() {
  const database = await freshDatabase();
  const karoo = await addVendor(database, "Karoo Farm", "approved");
  const eggs = await addProduct(
    database,
    karoo,
    {
      name: "Free-range eggs",
      description: "A tray of 30.",
      priceCents: 15000,
      deliverySchedules: ["weekly", "monthly"],
    },
    "2026-01-01",
  );
  const thandi = await addCustomer(database, "thandi@example.test");
  const sipho = await addCustomer(database, "sipho@example.test");
  await subscribe(
    database,
    thandi,
    { productId: eggs.id, deliverySchedule: "weekly" },
    "2026-11-01",
  );
  await subscribe(
    database,
    sipho,
    { productId: eggs.id, deliverySchedule: "monthly" },
    "2026-11-01",
  );
  return { database, karoo, eggs: eggs.id, thandi, sipho };
}
