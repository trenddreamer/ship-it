// The journey test (e2e/journey.test.ts) in Chromium, against the production
// server. Run it with `npm run test:journey`: e2e/run.ts picks the port and a
// fresh database, then calls Playwright with JOURNEY_PORT and DATABASE_PATH set.
import { defineConfig, devices } from "@playwright/test";

const port = process.env.JOURNEY_PORT;
if (!port || !process.env.DATABASE_PATH) {
  throw new Error("Run the journey with `npm run test:journey`, not Playwright directly.");
}
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "journey.test.ts",
  outputDir: "test-results",
  // One journey, its steps in order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: baseURL,
    env: { PORT: port, HOST: "127.0.0.1" },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
