import { cruise } from "dependency-cruiser";
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config";
import { describe, expect, it } from "vitest";
import { deliveryAddressLine } from "../client";

/**
 * Everything outside app/ that `entry` loads at run time, however indirectly.
 * Types are erased first, as they are for the browser bundle.
 */
async function externalDependencies(entry: string): Promise<string[]> {
  const result = await cruise(
    [entry],
    {
      tsPreCompilationDeps: false,
      doNotFollow: { path: "node_modules" },
      tsConfig: { fileName: "tsconfig.json" },
    },
    { extensions: [".ts", ".tsx", ".js"] },
    { tsConfig: extractTSConfig("tsconfig.json") },
  );
  if (typeof result.output === "string") throw new Error("expected cruise results");
  return result.output.modules
    .filter((module) => module.coreModule || module.source.startsWith("node_modules/"))
    .map((module) => module.source);
}

describe("client.ts", () => {
  it("serves the one-line Delivery Address components show", () => {
    const address = {
      street: "1 Long St",
      suburb: "Gardens",
      city: "Cape Town",
      postalCode: "8001",
    };
    expect(deliveryAddressLine(address)).toBe("1 Long St, Gardens, Cape Town, 8001");
  });

  it("loads no Node built-in and no database driver, so it is safe in the browser", async () => {
    const loaded = await externalDependencies("app/modules/accounts/client.ts");
    expect(loaded.filter((source) => !source.startsWith("node_modules/"))).toEqual([]);
    expect(loaded.filter((source) => /@libsql|drizzle-orm\/libsql/.test(source))).toEqual([]);
  });
});
