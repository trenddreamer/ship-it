// Entry point: what the browser may use from Theme. Components import from
// here. `./index` is browser-safe too today, but components go through
// `client.ts` so the boundary check can hold every module to the same rule.
export { nextThemeChoice, pageTheme, type ThemeChoice } from "./lib/choice";
