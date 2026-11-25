// Journey steps (see e2e/journey.test.ts, which runs them in order):
// Time moves on: Deliveries fall due, Vendors ship and charge them, and Prices change.
import { expect, test } from "@playwright/test";
import {
  johannesburgDay,
  johannesburgIsoDay,
  johannesburgTomorrow,
  markShipped,
  newCustomer,
  rooibosVendor,
  runDueDeliveriesJob,
  signIn,
  signOut,
} from "../helpers";

export function deliveryAndPriceSteps() {
  test("the next day the Delivery falls due, and the Vendor sees it", async ({ page, request }) => {
    const tomorrow = johannesburgIsoDay(1);
    expect((await runDueDeliveriesJob(request, tomorrow, { secret: "" })).status()).toBe(401);
    expect((await runDueDeliveriesJob(request, tomorrow)).ok()).toBe(true);

    await signIn(page, rooibosVendor);
    const due = page.getByRole("region", { name: "Deliveries due" }).getByRole("listitem");
    await expect(due).toHaveCount(1);
    await expect(due).toContainText("Rooibos chai (100 g)");
    await expect(due).toContainText(`Due ${johannesburgTomorrow()}`);
    await expect(due).toContainText(`To ${newCustomer.email}, 40 Bree Street, Gardens, Cape Town`);
    await expect(due).toContainText("R 65,50");
  });

  test("the Vendor ships it, and the Customer sees the Charge and the Notification", async ({
    page,
  }) => {
    await signIn(page, rooibosVendor);
    await markShipped(page, "Rooibos chai (100 g)", newCustomer.email);
    const vendorCharges = page.getByRole("region", { name: "Charges" }).getByRole("listitem");
    await expect(vendorCharges).toHaveCount(1);
    await expect(vendorCharges).toContainText(`Rooibos chai (100 g)${newCustomer.email}`);
    await expect(vendorCharges).toContainText(`Charged ${johannesburgDay(0)}R 65,50`);
    await signOut(page);

    await signIn(page, newCustomer);
    await page.getByRole("link", { name: /^Inbox/ }).click();
    await expect(page.getByRole("listitem").first()).toContainText(
      `Cederberg Rooibos shipped your Rooibos chai (100 g), due ${johannesburgTomorrow()}. You were charged R 65,50.`,
    );
    await page.getByRole("link", { name: "Your Charges" }).click();
    const charges = page.getByRole("main").getByRole("listitem");
    await expect(charges).toHaveCount(1);
    await expect(charges).toContainText("Rooibos chai (100 g)From Cederberg Rooibos");
    await expect(charges).toContainText(`Charged ${johannesburgDay(0)}R 65,50`);
  });
}
