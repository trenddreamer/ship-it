// Entry point (server only): the theme choice in a cookie. The root loader
// reads it with `themeChoiceFromRequest`; the theme route parses the toggle's
// form with `themeFormSchema` and saves it with `saveThemeChoice`.
export { saveThemeChoice, themeChoiceFromRequest, themeFormSchema } from "./lib/cookie";
