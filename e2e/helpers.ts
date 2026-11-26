// Helpers and fixtures for the journey (e2e/journey.test.ts): the demo
// Accounts, and the steps a person repeats through the browser. Browser only:
// never import from `app/`.
import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** The card of a Vendor on the home page. */
export function vendorCard(page: Page, name: string) {
  return page.getByRole("listitem").filter({
    has: page.getByRole("heading", { level: 2, name, exact: true }),
  });
}

/**
 * The seeded demo Accounts (app/db/seed.ts). The Admin is the configured
 * first Admin, with the local defaults from app/config.server.ts.
 */
export const demo = {
  admin: { email: "admin@ship-it.test", password: "admin-password" },
  customer: { email: "customer@ship-it.test", password: "customer-password" },
  // Approved in the seed; sells the espresso the seeded Customer subscribes to.
  coffeeVendor: { email: "coffee@ship-it.test", password: "vendor-password" },
  // Pending in the seed; the Admin rejects it in the journey.
  rejectedVendor: { email: "bakery@ship-it.test", password: "vendor-password" },
};

/** The Vendor who signs up in the journey: pending, until the Admin approves it. */
export const rooibosVendor = { email: "lindiwe@rooibos.test", password: "rooibos-password" };

/** The Customer who signs up in the journey, and where they live. */
export const newCustomer = { email: "naledi@example.test", password: "naledi-password" };
export const address = {
  street: "12 Long Street",
  suburb: "Gardens",
  city: "Cape Town",
  postalCode: "8001",
};

/** Fills in and saves the Delivery Address form. */
export async function fillAddress(page: Page, value: typeof address) {
  await page.getByLabel("Street address").fill(value.street);
  await page.getByLabel("Suburb").fill(value.suburb);
  await page.getByLabel("City or town").fill(value.city);
  await page.getByLabel("Postal code").fill(value.postalCode);
  await page.getByRole("button", { name: "Save Delivery Address" }).click();
}

/** Tomorrow's date in Johannesburg (no daylight saving there), as the app shows dates. */
export function johannesburgTomorrow() {
  return johannesburgDay(1);
}

/** The day `offset` days from today in Johannesburg, as the app shows dates. */
export function johannesburgDay(offset: number) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(Date.now() + offset * 24 * 60 * 60 * 1000));
}

/** The day `offset` days from today in Johannesburg, as "YYYY-MM-DD". */
export function johannesburgIsoDay(offset: number) {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(
    new Date(Date.now() + offset * 24 * 60 * 60 * 1000),
  );
}

/**
 * Runs the daily job that makes Deliveries fall due, as if `today` (a
 * "YYYY-MM-DD") were today: the journey's only way to move time forward.
 * Sends the secret e2e/run.ts gives the server. Returns the response.
 */
export async function runDueDeliveriesJob(
  request: APIRequestContext,
  today: string,
  { secret = process.env.CRON_SECRET } = {},
) {
  return request.get(`/jobs/create-due-deliveries?today=${today}`, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

/**
 * On the Vendor page, the signed-in Vendor marks the due Delivery of
 * `productName` to `customerEmail` shipped, today, and waits for it to leave
 * "Deliveries due". That charges the Customer and notifies them.
 */
export async function markShipped(page: Page, productName: string, customerEmail: string) {
  await page.goto("/vendor");
  const button = page.getByRole("button", {
    name: `Mark ${productName} for ${customerEmail} shipped`,
  });
  await expect(button).toHaveCount(1);
  await button.click();
  await expect(button).toHaveCount(0);
}

/** Adds a Product from the Vendor page through the new-Product form. */
export async function addProduct(
  page: Page,
  product: { name: string; description: string; price: string; schedules: string[] },
) {
  await page.getByRole("link", { name: "Add a Product" }).click();
  await page.getByLabel("Name").fill(product.name);
  await page.getByLabel("Description").fill(product.description);
  await page.getByLabel("Price per Delivery (R)").fill(product.price);
  for (const schedule of product.schedules) {
    await page.getByRole("checkbox", { name: schedule }).check();
  }
  await page.getByRole("button", { name: "Add Product" }).click();
}

/** Signs in through the sign-in page. Waits for the sign-in page to be left. */
export async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/sign-in$/);
}

/** Signs out through the account menu at the end of the header. */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
}
