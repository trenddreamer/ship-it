import { describe, expect, it } from "vitest";
import { browserUnsafeDependencies } from "../index";

const fixture = (name: string) => `app/modules/browser-safety/tests/fixtures/${name}.ts`;

describe("browserUnsafeDependencies", () => {
  it("reports nothing for a file the browser can load, even with an erased type import", async () => {
    expect(await browserUnsafeDependencies(fixture("safe"))).toEqual([]);
  });

  it("reports a Node built-in, however indirectly it is loaded", async () => {
    expect(await browserUnsafeDependencies(fixture("node-built-in"))).toEqual(["crypto"]);
  });

  it("follows `~/` imports to what they load", async () => {
    expect(await browserUnsafeDependencies(fixture("aliased"))).toEqual(["crypto"]);
  });

  it("reports the database driver", async () => {
    const unsafe = await browserUnsafeDependencies(fixture("database-driver"));
    expect(unsafe).toHaveLength(1);
    expect(unsafe[0]).toMatch(/node_modules\/@libsql\/client\//);
  });

  it("reports Drizzle's libSQL driver", async () => {
    const unsafe = await browserUnsafeDependencies(fixture("drizzle-driver"));
    expect(unsafe).toHaveLength(1);
    expect(unsafe[0]).toMatch(/node_modules\/drizzle-orm\/libsql\//);
  });

  it("reports a .server.ts file", async () => {
    expect(await browserUnsafeDependencies(fixture("server-only"))).toEqual([
      "app/modules/browser-safety/tests/fixtures/secret.server.ts",
    ]);
  });
});
