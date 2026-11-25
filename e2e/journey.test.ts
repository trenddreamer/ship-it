// The Marketplace journey, end to end, through the browser only.
//
// One test file, one journey: each ticket appends the steps its slice makes
// possible, in order, inside the `test.describe.serial` block below. The
// steps share the one database the run started with, so a later step sees
// what an earlier one did. Never import from `app/`: the journey sees only
// what a person sees. Run it with `npm run test:journey` (see e2e/run.ts).
import { expect, test } from "@playwright/test";
import {
  addProduct,
  address,
  demo,
  fillAddress,
  johannesburgDay,
  johannesburgIsoDay,
  johannesburgTomorrow,
  newCustomer,
  rooibosVendor,
  runDueDeliveriesJob,
  signIn,
  signOut,
  vendorCard,
} from "./helpers";

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

    await page.goto("/");
    await page.getByRole("link", { name: "Your Subscriptions" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Free-range eggs (30)",
      "House espresso blend (500 g)",
      "Karoo lamb box",
    ]);
  });

  test("the Admin finds the Vendor sign-up in their Inbox, and it is read once opened", async ({
    page,
  }) => {
    await signIn(page, demo.admin);
    const inbox = page.getByRole("link", { name: /^Inbox/ });
    // The seed's Vendor sign-ups notified the Admin too, so more than one is unread.
    await expect(inbox).toHaveText(/^Inbox \(\d+ unread\)$/);

    await inbox.click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(page.getByRole("listitem").first()).toContainText(
      "Cederberg Rooibos signed up as a Vendor and is awaiting approval.",
    );
    await expect(inbox).toHaveText("Inbox");

    await page.getByRole("link", { name: "Marketplace", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(inbox).toHaveText("Inbox");
    await signOut(page);

    await signIn(page, demo.customer);
    await page.getByRole("link", { name: /^Inbox/ }).click();
    await expect(page.getByText("No Notifications yet.")).toBeVisible();
  });

  test("a pending Vendor's new Product stays hidden from Customers", async ({ page }) => {
    await signIn(page, rooibosVendor);
    await addProduct(page, {
      name: "Green rooibos (250 g)",
      description: "Unfermented rooibos leaves.",
      price: "89",
      schedules: ["Every two weeks"],
    });
    await expect(page.getByRole("listitem").filter({ hasText: "Green rooibos" })).toContainText(
      "R 89,00",
    );

    await page.goto("/");
    await expect(vendorCard(page, "Karoo Free-Range Farm")).toBeVisible();
    await expect(page.getByText("Green rooibos (250 g)")).toHaveCount(0);
  });

  test("the Admin approves the Vendor who signed up and rejects another; only the approved one shows", async ({
    page,
  }) => {
    await signIn(page, demo.admin);
    const pending = page
      .getByRole("region", { name: "Vendors awaiting approval" })
      .getByRole("listitem");
    await expect(pending.getByRole("heading", { level: 3 })).toHaveText([
      "Joburg Craft Bakery",
      "Cederberg Rooibos",
    ]);
    await expect(pending.filter({ hasText: "Cederberg Rooibos" })).toContainText(
      "Organic rooibos from Clanwilliam.",
    );

    await page.getByRole("button", { name: "Approve Cederberg Rooibos" }).click();
    await expect(pending.getByRole("heading", { level: 3 })).toHaveText(["Joburg Craft Bakery"]);
    await page.getByRole("button", { name: "Reject Joburg Craft Bakery" }).click();
    await expect(page.getByText("No Vendors are awaiting approval.")).toBeVisible();
    await signOut(page);

    await page.goto("/");
    const rooibos = vendorCard(page, "Cederberg Rooibos");
    await expect(rooibos.getByRole("heading", { level: 3 })).toHaveText(["Green rooibos (250 g)"]);
    await expect(page.getByText("Joburg Craft Bakery")).toHaveCount(0);

    await signIn(page, rooibosVendor);
    await expect(page.getByText(/^Approved/)).toBeVisible();
    await page.getByRole("link", { name: /^Inbox/ }).click();
    await expect(page.getByRole("listitem").first()).toContainText(
      "An Admin approved Cederberg Rooibos.",
    );
  });

  test("a rejected Vendor signs in and sees only that they were rejected", async ({ page }) => {
    await signIn(page, demo.rejectedVendor);
    await expect(page).toHaveURL(/\/vendor$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Joburg Craft Bakery");
    await expect(page.getByText(/^Rejected/)).toBeVisible();
    await expect(page.getByText("Sourdough loaf")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add a Product" })).toHaveCount(0);
    expect((await page.goto("/vendor/products/new"))?.status()).toBe(403);

    await page.goto("/inbox");
    await expect(page.getByRole("listitem").first()).toContainText(
      "An Admin rejected Joburg Craft Bakery.",
    );
  });

  test("the approved Vendor adds a Product with two Delivery Schedules, and Customers see it", async ({
    page,
  }) => {
    await signIn(page, rooibosVendor);
    await expect(page).toHaveURL(/\/vendor$/);

    const chai = {
      name: "Rooibos chai (100 g)",
      description: "Rooibos with cardamom and cinnamon, blended by hand.",
      schedules: ["Weekly", "Monthly"],
    };
    await addProduct(page, { ...chai, price: "-65" });
    await expect(page.getByText("Enter the Price in rand")).toBeVisible();

    await page.goto("/vendor");
    await addProduct(page, { ...chai, price: "65,50", schedules: [] });
    await expect(page.getByText("Pick at least one Delivery Schedule.")).toBeVisible();

    await page.goto("/vendor");
    await addProduct(page, { ...chai, price: "65,50" });
    await expect(page).toHaveURL(/\/vendor$/);
    const listed = page.getByRole("listitem").filter({ hasText: chai.name });
    await expect(listed).toContainText("R 65,50");
    await expect(listed).toContainText("Weekly, Monthly");

    await page.goto("/");
    const rooibos = vendorCard(page, "Cederberg Rooibos");
    await expect(rooibos.getByRole("heading", { level: 3 })).toHaveText([
      "Green rooibos (250 g)",
      chai.name,
    ]);
    await expect(rooibos).toContainText("R 65,50");
  });

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
});
