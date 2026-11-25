# Theme colours are named, and follow the OS setting

The Marketplace's colours are named for what they are for (`surface`, `ink`, `muted`, `line`, `primary`, `danger`, …) in `app/modules/theme/theme.css`, and pages use those names (`text-muted`) rather than Tailwind's palette (`text-gray-600`). Each name holds a light and a dark value with CSS `light-dark()`, and `color-scheme: light dark` makes the browser pick the one that matches the OS setting.

We chose this over `dark:` variants on every colour class because one file then decides the palette, a page can't forget its dark half, and a test can check every pair of colours for contrast in both schemes.

We chose following the OS as the default because it needs no schema change, works for signed-out visitors and is a Two-way door change.

A toggle came later (#37), without touching the pages: the header's theme icon saves Match my device, Light or Dark in a cookie, and the server sets `data-theme="light"` or `"dark"` on `<html>`, which rules in `theme.css` turn into `color-scheme: light` or `dark`. A cookie rather than an Account setting, because it needs no migration, works signed out, and lets the server render the chosen theme so a dark page never flashes light.

This ADR first said a toggle "only has to set `color-scheme` on `<html>`". That is true of the source CSS but not of the build: Lightning CSS compiles each `light-dark()` into `var(--lightningcss-light, …) var(--lightningcss-dark, …)` for browsers without `light-dark()`, and only flips those variables beside the `color-scheme` declarations it compiles. A `color-scheme` set from script, or in a `style` attribute, never passes through it, so the page stays light. Pin the scheme with a rule in `theme.css`. The journey (`e2e/journey/6-theme.ts`) checks this against the production build.

The dark values are Tailwind's grays and reds, picked by the Factory to pass WCAG AA (4.5:1) for text. A designer may replace them; the tests in `app/modules/theme/tests/` say which pairs must stay readable.
