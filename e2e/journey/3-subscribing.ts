// Journey steps (see e2e/journey.test.ts, which runs them in order):
// Customers subscribe, switch Delivery Schedules and cancel; Vendors are told.
import { expect, test } from "@playwright/test";
import {
  address,
  demo,
  fillAddress,
  johannesburgDay,
  johannesburgTomorrow,
  newCustomer,
  rooibosVendor,
  signIn,
} from "../helpers";

export function subscribingSteps() {
  test("a Customer signs up, sets a Delivery Address, finds the chai and subscribes", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Email").fill(newCustomer.email);
    await page.getByLabel("Password").fill(newCustomer.password);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/$/);

    const search = page.getByRole("searchbox", { name: "Search" });
    await search.fill("chai");
    await search.press("Enter");
    await page.getByRole("link", { name: "Subscribe to Rooibos chai (100 g)" }).click();

    // No Delivery Address yet, so they're asked for one first.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Delivery Address");
    await fillAddress(page, { ...address, postalCode: "80" });
    await expect(page.getByText("Enter the 4-digit postal code.")).toBeVisible();
    await fillAddress(page, address);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Subscribe to Rooibos chai (100 g)",
    );
    await expect(page.getByRole("radio")).toHaveCount(2);
    await expect(page.getByRole("radio", { name: "Every two weeks" })).toHaveCount(0);
    await page.getByRole("radio", { name: "Monthly" }).check();
    await page.getByRole("button", { name: "Subscribe" }).click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    const chai = page.getByRole("listitem").filter({ hasText: "Rooibos chai (100 g)" });
    await expect(chai).toContainText("Cederberg Rooibos");
    await expect(chai).toContainText("Monthly");
    await expect(chai).toContainText("R 65,50");
    await expect(chai).toContainText(`Next Delivery due ${johannesburgTomorrow()}`);
    await expect(page.getByText("12 Long Street, Gardens, Cape Town, 8001")).toBeVisible();

    await page.getByRole("link", { name: "Change your Delivery Address" }).click();
    await expect(page.getByLabel("Street address")).toHaveValue("12 Long Street");
    await fillAddress(page, { ...address, street: "40 Bree Street" });
    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText("40 Bree Street, Gardens, Cape Town, 8001")).toBeVisible();

    // A second Subscription to the same Product is refused.
    await page.goto("/?q=chai");
    await page.getByRole("link", { name: "Subscribe to Rooibos chai (100 g)" }).click();
    await page.getByRole("radio", { name: "Weekly" }).check();
    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "You already have a Subscription to this Product.",
    );
  });

  test("the Vendor is notified of the Subscription and sees it on their Product", async ({
    page,
  }) => {
    await signIn(page, rooibosVendor);
    await page.getByRole("link", { name: /^Inbox/ }).click();
    await expect(page.getByRole("listitem").first()).toContainText(
      `${newCustomer.email} subscribed to Rooibos chai (100 g), delivered monthly.`,
    );

    await page.goto("/vendor");
    const chai = page.getByRole("listitem").filter({ hasText: "Rooibos chai (100 g)" });
    await expect(chai).toContainText("1 active Subscription");
    await expect(chai).toContainText(newCustomer.email);
  });

  test("the seeded Customer switches one Subscription's schedule and cancels another", async ({
    page,
  }) => {
    await signIn(page, demo.customer);
    await page.goto("/subscriptions");

    // Eggs: Weekly, switched to Every two weeks, next due the day after the switch.
    const eggs = page.getByRole("listitem").filter({ hasText: "Free-range eggs (30)" });
    await expect(eggs.getByRole("combobox", { name: "Switch to" }).locator("option")).toHaveText([
      "Every two weeks",
    ]);
    await eggs.getByRole("button", { name: "Switch schedule" }).click();
    await expect(eggs).toContainText("delivered Every two weeks");
    await expect(eggs).toContainText(`Next Delivery due ${johannesburgTomorrow()}`);

    // The lamb box offers only Monthly, so there is nothing to switch to.
    const lamb = page.getByRole("listitem").filter({ hasText: "Karoo lamb box" });
    await expect(lamb.getByRole("combobox", { name: "Switch to" })).toHaveCount(0);

    // Espresso: cancelled, shown as cancelled with no next due date.
    const espresso = page.getByRole("listitem").filter({ hasText: "House espresso blend" });
    await espresso.getByRole("button", { name: "Cancel Subscription" }).click();
    await expect(espresso).toContainText(`Cancelled on ${johannesburgDay(0)}`);
    await expect(espresso).not.toContainText("Next Delivery due");
    await expect(espresso.getByRole("button")).toHaveCount(0);

    // ...and the Customer can subscribe to it again.
    await page.goto("/?q=espresso");
    await page.getByRole("link", { name: "Subscribe to House espresso blend (500 g)" }).click();
    await page.getByRole("radio", { name: "Monthly" }).check();
    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(espresso).toHaveCount(2);
    await expect(espresso.first()).toContainText("delivered Monthly");
    await expect(espresso.last()).toContainText("Cancelled on");
  });

  test("the Vendor is notified of the cancellation", async ({ page }) => {
    await signIn(page, demo.coffeeVendor);
    await page.getByRole("link", { name: /^Inbox/ }).click();
    await expect(page.getByRole("listitem").nth(1)).toContainText(
      `${demo.customer.email} cancelled their Subscription to House espresso blend (500 g).`,
    );
    await expect(page.getByRole("listitem").first()).toContainText(
      `${demo.customer.email} subscribed to House espresso blend (500 g), delivered monthly.`,
    );
  });
}
