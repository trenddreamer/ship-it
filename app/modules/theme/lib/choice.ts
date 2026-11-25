import { z } from "zod";

/**
 * Which theme someone picked: `system` follows the OS setting, `light` and
 * `dark` pin one whatever the OS says. Nobody has picked yet means `system`.
 */
export const themeChoiceSchema = z.enum(["system", "light", "dark"]);
export type ThemeChoice = z.infer<typeof themeChoiceSchema>;

const nextChoice: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

/** The choice after `choice`, for a control that cycles through them all. */
export function nextThemeChoice(choice: ThemeChoice): ThemeChoice {
  return nextChoice[choice];
}

/**
 * What `<html>` needs for `choice`: its `data-theme` attribute, which
 * theme.css turns into a `color-scheme` (none when following the OS), and
 * the content of the `color-scheme` meta tag, which lets the browser paint
 * the right background before the stylesheet loads.
 */
export function pageTheme(choice: ThemeChoice): {
  dataTheme: "light" | "dark" | undefined;
  colorScheme: "light dark" | "light" | "dark";
} {
  return choice === "system"
    ? { dataTheme: undefined, colorScheme: "light dark" }
    : { dataTheme: choice, colorScheme: choice };
}
