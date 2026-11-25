// Journey steps (see e2e/journey.test.ts, which runs them in order):
// Time moves on: Deliveries fall due, Vendors ship and charge them, and Prices change.
import { expect, test } from "@playwright/test";
import {
  demo,
  johannesburgDay,
  johannesburgIsoDay,
  johannesburgTomorrow,
  markShipped,
  newCustomer,
  rooibosVendor,
  runDueDeliveriesJob,
  signIn,
  signOut,
  vendorCard,
} from "../helpers";

const chai = "Rooibos chai (100 g)";

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

  test("the Vendor changes the chai's Price; its subscribers are told when it takes effect", async ({
    page,
  }) => {
    // The seeded Customer subscribes weekly first, so their next Delivery falls due tomorrow.
    await signIn(page, demo.customer);
    await page.goto("/?q=chai");
    await page.getByRole("link", { name: `Subscribe to ${chai}` }).click();
    await page.getByRole("radio", { name: "Weekly" }).check();
    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(page).toHaveURL(/\/subscriptions$/);
    await signOut(page);

    await signIn(page, rooibosVendor);
    await page.getByRole("link", { name: `Change the Price of ${chai}` }).click();
    const newPrice = page.getByLabel("New Price per Delivery (R)");
    const change = page.getByRole("button", { name: "Change Price" });
    await newPrice.fill("-72");
    await change.click();
    await expect(page.getByText("Enter the Price in rand")).toBeVisible();
    await newPrice.fill("65,50");
    await change.click();
    await expect(page.getByRole("alert")).toHaveText(
      "That is already the Price. Enter a different one.",
    );
    await newPrice.fill("72");
    await change.click();
    await expect(page).toHaveURL(/\/vendor$/);
    const products = page.getByRole("region", { name: "Your Products" });
    await expect(products.getByRole("listitem").filter({ hasText: chai })).toContainText("R 72,00");
    await signOut(page);

    // New subscribers see the new Price straight away.
    await page.goto("/");
    await expect(vendorCard(page, "Cederberg Rooibos")).toContainText("R 72,00");

    const told = `Cederberg Rooibos changed the Price of ${chai} from R 65,50 to R 72,00. The new Price takes effect on ${johannesburgDay(7)}.`;
    for (const customer of [demo.customer, newCustomer]) {
      await signIn(page, customer);
      await page.getByRole("link", { name: /^Inbox/ }).click();
      await expect(page.getByRole("listitem").first()).toContainText(told);
      await signOut(page);
    }
  });

  test("a Delivery due inside the Notice Period is charged the old Price, and one due after it the new", async ({
    page,
    request,
  }) => {
    expect((await runDueDeliveriesJob(request, johannesburgIsoDay(1))).ok()).toBe(true);
    await signIn(page, rooibosVendor);
    const due = page.getByRole("region", { name: "Deliveries due" }).getByRole("listitem");
    await expect(due).toHaveCount(1);
    await expect(due).toContainText(`Due ${johannesburgTomorrow()}`);
    await expect(due).toContainText(`To ${demo.customer.email}`);
    await expect(due).toContainText("R 65,50");
    await markShipped(page, chai, demo.customer.email);
    await signOut(page);

    await signIn(page, demo.customer);
    await page.getByRole("link", { name: "Your Charges" }).click();
    await expect(page.getByRole("main").getByRole("listitem").first()).toContainText(
      `${chai}From Cederberg Rooibos`,
    );
    await expect(page.getByRole("main").getByRole("listitem").first()).toContainText("R 65,50");
    await signOut(page);

    // A week later, the Notice Period is over.
    expect((await runDueDeliveriesJob(request, johannesburgIsoDay(8))).ok()).toBe(true);
    await signIn(page, rooibosVendor);
    await expect(due).toHaveCount(1);
    await expect(due).toContainText(`Due ${johannesburgDay(8)}`);
    await expect(due).toContainText("R 72,00");
  });
}
