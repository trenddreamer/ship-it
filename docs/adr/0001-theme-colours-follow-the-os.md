# Theme colours are named, and follow the OS setting

The Marketplace's colours are named for what they are for (`surface`, `ink`, `muted`, `line`, `primary`, `danger`, …) in `app/modules/theme/theme.css`, and pages use those names (`text-muted`) rather than Tailwind's palette (`text-gray-600`). Each name holds a light and a dark value with CSS `light-dark()`, and `color-scheme: light dark` makes the browser pick the one that matches the OS setting.

We chose this over `dark:` variants on every colour class because one file then decides the palette, a page can't forget its dark half, and a test can check every pair of colours for contrast in both schemes.

We chose following the OS over a light / dark / system toggle because it needs no schema change, works for signed-out visitors and is a Two-way door change. A toggle can come later without touching the pages: it only has to set `color-scheme` on `<html>`, from a cookie or an Account setting.

The dark values are Tailwind's grays and reds, picked by the Factory to pass WCAG AA (4.5:1) for text. A designer may replace them; the tests in `app/modules/theme/tests/` say which pairs must stay readable.
