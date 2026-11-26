// Journey steps (see e2e/journey.test.ts, which runs them in order):
// A visitor picks light or dark from the header, whatever the OS says, and
// the header fits a phone.
import { expect, test, type Page } from "@playwright/test";
import { demo, signIn, signOut } from "../helpers";

// The theme's page background (app/modules/theme/theme.css) in each scheme.
const lightPage = "rgb(255, 255, 255)";
const darkPage = "rgb(17, 24, 39)";

async function pickNextTheme(page: Page, picked: string) {
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await expect(
    page.getByRole("button", { name: new RegExp(`^Theme: ${picked}\\.`) }),
  ).toBeVisible();
}

export function themeSteps() {
  // Against the production build, whose compiled CSS is what ADR 0001's first
  // toggle plan got wrong.
  test("a visitor pins Light or Dark over the OS setting, and it stays after a reload", async ({
    page,
  }) => {
    const body = page.locator("body");
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Theme: Match my device\./ })).toBeVisible();
    await expect(body).toHaveCSS("background-color", lightPage);

    await pickNextTheme(page, "Light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(body).toHaveCSS("background-color", lightPage);

    await pickNextTheme(page, "Dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(body).toHaveCSS("background-color", darkPage);

    // The server renders the saved choice, before any script runs.
    await page.reload();
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "dark");
    await expect(body).toHaveCSS("background-color", darkPage);

    await pickNextTheme(page, "Match my device");
    await expect(body).toHaveCSS("background-color", lightPage);
  });

  test("the header fits a 320px phone, for a visitor and for a Customer", async ({ page }) => {
    const width = 320;
    await page.setViewportSize({ width, height: 640 });
    // The header fits when its last icon, the theme's, keeps as much room to
    // the right edge as the Marketplace link keeps to the left one.
    async function expectHeaderFits() {
      const first = await page
        .getByRole("link", { name: "Marketplace", exact: true })
        .boundingBox();
      const last = await page.getByRole("button", { name: /^Theme:/ }).boundingBox();
      expect(width - (last!.x + last!.width)).toBeGreaterThanOrEqual(first!.x);
    }

    await page.goto("/");
    await expectHeaderFits();

    await signIn(page, demo.customer);
    await expect(page.getByRole("link", { name: "Charges", exact: true })).toBeVisible();
    await expectHeaderFits();
    await signOut(page);
  });
}
