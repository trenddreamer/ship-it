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

/**
 * The seeded demo Accounts (app/db/seed.ts). The Admin is the configured
 * first Admin, with the local defaults from app/config.server.ts.
 */
const demo = {
  admin: { email: "admin@ship-it.test", password: "admin-password" },
  customer: { email: "customer@ship-it.test", password: "customer-password" },
};

/** Signs in through the sign-in page. Waits for the sign-in page to be left. */
async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/sign-in$/);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
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

  test("a visitor is sent to sign in, and a wrong password doesn't say which was wrong", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.getByLabel("Email").fill(demo.admin.email);
    await page.getByLabel("Password").fill("not the password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toHaveText("Wrong email or password.");
  });

  test("the seeded Admin signs in, reaches the Admin page and signs out", async ({ page }) => {
    await signIn(page, demo.admin);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Admin");

    await signOut(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("a visitor signs up as a Vendor, pending, and the Admin page refuses them", async ({
    page,
  }) => {
    await page.goto("/sign-up/vendor");
    await page.getByLabel("Email").fill("lindiwe@rooibos.test");
    await page.getByLabel("Password").fill("rooibos-password");
    await page.getByLabel("Business name").fill("Cederberg Rooibos");
    await page.getByLabel("Description").fill("Organic rooibos from Clanwilliam.");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page).toHaveURL(/\/vendor$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cederberg Rooibos");
    await expect(page.getByText(/^Pending/)).toBeVisible();

    const refused = await page.goto("/admin");
    expect(refused?.status()).toBe(403);

    await page.goto("/");
    await signOut(page);
    await page.goto("/sign-up");
    await page.getByLabel("Email").fill("lindiwe@rooibos.test");
    await page.getByLabel("Password").fill("another-password");
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("That email already has an Account.")).toBeVisible();
  });

  test("the seeded Customer signs in and lands on the Marketplace", async ({ page }) => {
    await signIn(page, demo.customer);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marketplace");
    expect((await page.goto("/vendor"))?.status()).toBe(403);
  });
});
