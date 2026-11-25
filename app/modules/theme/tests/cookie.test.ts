import { describe, expect, it } from "vitest";
import { saveThemeChoice, themeChoiceFromRequest, themeFormSchema } from "../server";

/** A request carrying the cookie a `Set-Cookie` header value would set. */
function requestWithCookie(setCookie: string): Request {
  const cookie = setCookie.split(";")[0] ?? "";
  return new Request("http://localhost/", { headers: { Cookie: cookie } });
}

describe("the theme cookie", () => {
  it("reads back each choice it saved", async () => {
    for (const choice of ["system", "light", "dark"] as const) {
      expect(await themeChoiceFromRequest(requestWithCookie(await saveThemeChoice(choice)))).toBe(
        choice,
      );
    }
  });

  it("follows the OS for a visitor who never picked", async () => {
    expect(await themeChoiceFromRequest(new Request("http://localhost/"))).toBe("system");
  });

  it("follows the OS when the cookie holds something that isn't a choice", async () => {
    const garbled = await saveThemeChoice("dark");
    const forged = garbled.replace(/^theme=[^;]*/, `theme=${btoa(JSON.stringify("blue"))}`);
    expect(await themeChoiceFromRequest(requestWithCookie(forged))).toBe("system");
    expect(await themeChoiceFromRequest(requestWithCookie("theme=not-even-base64!!"))).toBe(
      "system",
    );
  });

  it("is sent for every page, kept for a year, and hidden from scripts", async () => {
    const header = await saveThemeChoice("dark");
    expect(header).toMatch(/; Path=\//);
    expect(header).toMatch(/; Max-Age=31536000/);
    expect(header).toMatch(/; HttpOnly/);
    expect(header).toMatch(/; SameSite=Lax/);
  });
});

describe("themeFormSchema", () => {
  it("takes a choice", () => {
    expect(themeFormSchema.parse({ theme: "dark" })).toEqual({ theme: "dark" });
  });

  it("rejects anything else", () => {
    expect(themeFormSchema.safeParse({ theme: "blue" }).success).toBe(false);
    expect(themeFormSchema.safeParse({}).success).toBe(false);
  });
});
