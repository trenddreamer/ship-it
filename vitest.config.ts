import { defineConfig } from "vitest/config";

// Tests run in UTC, so a test fails if a script uses the machine's local time
// zone. Set here, before the test workers start, as they read it once at
// startup.
process.env.TZ = "UTC";

// The Factory's scripts: the pure rules in .sandcastle/agent-workflows/, each
// with its tests next to it.
export default defineConfig({
  test: {
    include: [".sandcastle/**/*.test.ts"],
    environment: "node",
  },
});
