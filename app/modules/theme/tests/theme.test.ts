import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The theme is CSS, so these tests read the entry point, theme.css, and the
// pages that use it, as text.
const appDir = join(import.meta.dirname, "../../..");
const themeCss = readFileSync(join(appDir, "modules/theme/theme.css"), "utf8");

type Scheme = "light" | "dark";

/** Every `--color-<name>: light-dark(<light>, <dark>)` in theme.css. */
function themeColours(): Map<string, Record<Scheme, string>> {
  const colours = new Map<string, Record<Scheme, string>>();
  for (const [, name = "", value = ""] of themeCss.matchAll(/--color-([a-z-]+):\s*([^;]+);/g)) {
    const [, light, dark] =
      /^light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)$/.exec(value.trim()) ?? [];
    if (!light || !dark) throw new Error(`--color-${name} is not light-dark(#rrggbb, #rrggbb)`);
    colours.set(name, { light, dark });
  }
  return colours;
}

/** The declarations of theme.css's rule for `selector`, in any order. */
function declarations(selector: string): Record<string, string> {
  const rule = themeCss
    .split("}")
    .map((block) => block.split("{"))
    .find(([head = ""]) => head.replace(/\/\*[\s\S]*?\*\//g, "").trim() === selector);
  if (!rule) throw new Error(`theme.css has no rule for ${selector}`);
  return Object.fromEntries(
    (rule[1] ?? "")
      .split(";")
      .map((declaration) => declaration.split(":").map((part) => part.trim()))
      .filter(([property]) => property)
      .map(([property = "", ...value]) => [property, value.join(":")]),
  );
}

/** WCAG 2 relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channel = (at: number) => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function colour(name: string, scheme: Scheme): string {
  const value = themeColours().get(name)?.[scheme];
  if (!value) throw new Error(`theme.css has no --color-${name}`);
  return value;
}

describe("the theme", () => {
  it("names its colours, each with a light and a dark value", () => {
    expect([...themeColours().keys()]).toEqual(
      expect.arrayContaining(["surface", "raised", "ink", "muted", "primary", "on-primary"]),
    );
  });

  it("follows the OS setting for light or dark", () => {
    expect(declarations(":root")).toMatchObject({ "color-scheme": "light dark" });
  });

  // A rule, not a style set from script: the build only switches the
  // compiled light-dark() colours beside color-scheme declarations it sees.
  it("pins one scheme when <html> has a data-theme", () => {
    expect(declarations(':root[data-theme="light"]')).toEqual({ "color-scheme": "light" });
    expect(declarations(':root[data-theme="dark"]')).toEqual({ "color-scheme": "dark" });
  });

  it("is dark in the dark scheme and light in the light one", () => {
    for (const name of ["surface", "raised"]) {
      expect(luminance(colour(name, "light"))).toBeGreaterThan(0.8);
      expect(luminance(colour(name, "dark"))).toBeLessThan(0.05);
    }
  });

  it("gives the page, and a dialog on it, the theme's background and text", () => {
    expect(declarations("body")).toMatchObject({
      "background-color": "var(--color-surface)",
      color: "var(--color-ink)",
    });
    expect(declarations("dialog")).toMatchObject({
      "background-color": "var(--color-raised)",
      color: "var(--color-ink)",
    });
  });

  // Text on a background, as the pages use them. WCAG AA asks for 4.5:1.
  const textPairs: [text: string, background: string][] = [
    ["ink", "surface"],
    ["ink", "raised"],
    ["muted", "surface"],
    ["muted", "raised"],
    ["on-primary", "primary"],
    ["on-danger", "danger-solid"],
    ["danger", "surface"],
    ["danger", "raised"],
    ["danger", "danger-soft"],
    ["ink", "warning-soft"],
    ["accent", "surface"],
    ["on-accent", "accent"],
  ];
  for (const scheme of ["light", "dark"] as const) {
    for (const [text, background] of textPairs) {
      it(`keeps ${text} on ${background} readable in the ${scheme} scheme`, () => {
        expect(contrast(colour(text, scheme), colour(background, scheme))).toBeGreaterThanOrEqual(
          4.5,
        );
      });
    }
  }

  it("sets the primary button apart from the page in both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      expect(contrast(colour("primary", scheme), colour("surface", scheme))).toBeGreaterThan(3);
    }
  });
});

/** Every .tsx file under app/, as [path, source]. */
function pages(): [string, string][] {
  return readdirSync(appDir, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".tsx"))
    .map((path) => [path, readFileSync(join(appDir, path), "utf8")]);
}

// Tailwind's own palette stays the same in dark mode, so a page that uses it
// stays light. A see-through black backdrop dims the page in either scheme.
const paletteClass =
  /(?<!backdrop:)\b(?:bg|text|border(?:-[xytrbl])?|divide|ring|outline|fill|stroke|placeholder|from|via|to|shadow|decoration)-(?:black|white|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)\b/g;

describe("the pages", () => {
  it("are found", () => {
    expect(pages().length).toBeGreaterThan(10);
  });

  it("use the theme's colours, not Tailwind's palette", () => {
    const offenders = pages().flatMap(([path, source]) =>
      [...source.matchAll(paletteClass)].map((match) => `${path}: ${match[0]}`),
    );
    expect(offenders).toEqual([]);
  });

  it("only use colour names the theme defines", () => {
    const names = themeColours();
    // The first word of each name (`danger` in `danger-soft`), so that a name
    // the theme doesn't define, such as `text-danger-strong`, is still caught.
    const families = [...new Set([...names.keys()].map((name) => name.split("-")[0]))];
    const used = pages().flatMap(([, source]) =>
      [
        ...source.matchAll(
          new RegExp(`\\b(?:bg|text|border|divide)-((?:${families.join("|")})[a-z-]*)`, "g"),
        ),
      ].map(([, name = ""]) => name),
    );
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((name) => !names.has(name))).toEqual([]);
  });
});
