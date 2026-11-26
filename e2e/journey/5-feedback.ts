// Journey steps (see e2e/journey.test.ts, which runs them in order):
// Someone signed in tells the Factory about the page they're on.
import { expect, test } from "@playwright/test";
import { newCustomer, signIn, signOut } from "../helpers";

export function feedbackSteps() {
  test("a signed-in Customer gives Feedback and is thanked; a visitor has no button", async ({
    page,
  }) => {
    await signIn(page, newCustomer);
    await page.getByRole("link", { name: "Subscriptions", exact: true }).click();
    await page.getByRole("button", { name: "Feedback" }).click();
    const dialog = page.getByRole("dialog", { name: "Feedback" });
    await dialog
      .getByLabel("What's wrong, or what could be better?")
      .fill("The Subscriptions page could show the next Delivery's date.");
    await dialog.getByRole("button", { name: "Send Feedback" }).click();
    await expect(dialog.getByRole("status")).toHaveText("Thanks, the Factory is looking at it.");
    // Sending never left the page.
    await expect(page).toHaveURL(/\/subscriptions$/);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await signOut(page);
    await expect(page.getByRole("button", { name: "Feedback" })).toHaveCount(0);
  });
}
