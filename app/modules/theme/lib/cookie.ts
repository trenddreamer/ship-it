import { createCookie } from "react-router";
import { z } from "zod";
import { themeChoiceSchema, type ThemeChoice } from "./choice";

// Unsigned and not `secure`: it holds only a display preference, and a forged
// or garbled value just reads as `system`.
const themeCookie = createCookie("theme", {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
});

/** The theme the visitor saved in their cookie, or `system` when there is none. */
export async function themeChoiceFromRequest(request: Request): Promise<ThemeChoice> {
  const saved = themeChoiceSchema.safeParse(await themeCookie.parse(request.headers.get("Cookie")));
  return saved.success ? saved.data : "system";
}

/** A `Set-Cookie` header value that saves `choice` for a year. */
export function saveThemeChoice(choice: ThemeChoice): Promise<string> {
  return themeCookie.serialize(choice);
}

/** The theme toggle's form as it arrives: the `theme` to switch to. */
export const themeFormSchema = z.object({ theme: themeChoiceSchema });
