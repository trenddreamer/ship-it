import { describe, expect, it } from "vitest";
import { browserUnsafeDependencies } from "~/modules/browser-safety";
import { nextThemeChoice, pageTheme } from "../client";

describe("client.ts", () => {
  it("serves the theme choice components cycle through", () => {
    expect(nextThemeChoice("dark")).toBe("system");
    expect(pageTheme("light").dataTheme).toBe("light");
  });

  it("loads no Node built-in, database driver or server-only file, so it is safe in the browser", async () => {
    expect(await browserUnsafeDependencies("app/modules/theme/client.ts")).toEqual([]);
  });
});
