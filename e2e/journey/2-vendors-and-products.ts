// Journey steps (see e2e/journey.test.ts, which runs them in order):
// Vendors add Products; the Admin approves one Vendor and rejects another.
import { expect, test } from "@playwright/test";
import { addProduct, demo, rooibosVendor, signIn, signOut, vendorCard } from "../helpers";

export function vendorAndProductSteps() {
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
}
