// The Marketplace journey, end to end, through the browser only.
//
// One test file, one journey: each ticket appends the steps its slice makes
// possible, in order, inside the `test.describe.serial` block below. The
// steps share the one database the run started with, so a later step sees
// what an earlier one did. Never import from `app/`: the journey sees only
// what a person sees. Run it with `npm run test:journey` (see e2e/run.ts).
import { expect, test, type Page } from "@playwright/test";

/** The card of a Vendor on the home page. */
function vendorCard(page: Page, name: string) {
  return page.getByRole("listitem").filter({
    has: page.getByRole("heading", { level: 2, name, exact: true }),
  });
}

test.describe.serial("Marketplace journey", () => {
  test("a visitor sees the approved Vendors, their Products and Prices on the home page", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Cape Town Coffee Roasters",
      "Durban Spice Co.",
      "Karoo Free-Range Farm",
    ]);

    const karoo = vendorCard(page, "Karoo Free-Range Farm");
    await expect(karoo.getByRole("heading", { level: 3 })).toHaveText([
      "Beef boerewors",
      "Free-range eggs (30)",
      "Karoo lamb box",
    ]);
    await expect(karoo).toContainText("R 150,00");
    await expect(karoo).toContainText("R 525,00");

    const coffee = vendorCard(page, "Cape Town Coffee Roasters");
    await expect(coffee).toContainText("House espresso blend (500 g)");
    await expect(coffee).toContainText("R 210,00");

    await expect(vendorCard(page, "Durban Spice Co.")).toContainText("No products yet");

    for (const hidden of [
      "Joburg Craft Bakery",
      "Sourdough loaf",
      "Garden Route Honey",
      "Fynbos honey (500 g)",
    ]) {
      await expect(page.getByText(hidden)).toHaveCount(0);
    }
  });

  test("a visitor searches for a seeded Product and sees its Vendor", async ({ page }) => {
    await page.goto("/");

    const search = page.getByRole("searchbox", { name: "Search" });
    await search.fill("BOEREWORS");
    await search.press("Enter");

    await expect(page).toHaveURL(/[?&]q=BOEREWORS/);
    await expect(search).toHaveValue("BOEREWORS");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Karoo Free-Range Farm"]);
    await expect(vendorCard(page, "Karoo Free-Range Farm")).toContainText("R 189,00");

    await search.fill("honey");
    await search.press("Enter");
    await expect(page.getByText("No Vendors match your search.")).toBeVisible();
  });
});
