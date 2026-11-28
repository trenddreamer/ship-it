import { describe, expect, it } from "vitest";
import { nextThemeChoice, pageTheme } from "../client";

describe("nextThemeChoice", () => {
  it("cycles Match my device, Light, Dark and round again", () => {
    expect(nextThemeChoice("system")).toBe("light");
    expect(nextThemeChoice("light")).toBe("dark");
    expect(nextThemeChoice("dark")).toBe("system");
  });
});

describe("pageTheme", () => {
  it("leaves the scheme to the OS when following it", () => {
    expect(pageTheme("system")).toEqual({ dataTheme: undefined, colorScheme: "light dark" });
  });

  it("pins the page and the browser's first paint to a picked scheme", () => {
    expect(pageTheme("light")).toEqual({ dataTheme: "light", colorScheme: "light" });
    expect(pageTheme("dark")).toEqual({ dataTheme: "dark", colorScheme: "dark" });
  });
});
