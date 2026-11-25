import { defineConfig } from "vitest/config";

// Tests run in UTC, not Johannesburg's +02:00, so a test fails if code uses
// the machine's local time zone where it means Africa/Johannesburg. Set here,
// before the test workers start, as they read it once at startup.
process.env.TZ = "UTC";

// Separate from vite.config.ts so tests don't load the React Router plugin.
export default defineConfig({
  // `~/` is app/, from the paths in tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    include: ["app/**/*.test.{ts,tsx}", ".sandcastle/**/*.test.ts"],
    environment: "node",
  },
});
