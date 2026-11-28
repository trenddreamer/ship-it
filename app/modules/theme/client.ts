// Entry point (safe for the browser): the theme someone picked, and what the
// page does with it. Components and the root route import from here. Saving it
// in a cookie is in `server.ts`; the colours themselves are in `theme.css`.
export { nextThemeChoice, pageTheme, type ThemeChoice } from "./lib/choice";
