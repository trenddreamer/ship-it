import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests don't load the React Router plugin.
export default defineConfig({
  // `~/` is app/, from the paths in tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    include: ["app/**/*.test.{ts,tsx}", ".sandcastle/**/*.test.ts"],
    environment: "node",
  },
});
