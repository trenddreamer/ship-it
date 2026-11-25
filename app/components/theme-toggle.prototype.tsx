// PROTOTYPE (theme toggle), throwaway. Lives on the prototype/theme-toggle
// branch only.
//
// Question: what should the light / dark mode control look like, and where
// should it sit? Four variants of the control, mounted in the real layout so
// they sit on every page, switchable via `?variant=A|B|C|D`.
//
// The choice is held in memory: it survives clicking around (the layout stays
// mounted) and resets on a full reload. Where it is saved (cookie or Account)
// is a separate question this prototype does not answer.
import { useEffect, useState, useSyncExternalStore } from "react";
import type { PrototypeVariant } from "./prototype-switcher";

export const themeToggleVariants: PrototypeVariant[] = [
  { key: "A", name: "Header icon, click cycles" },
  { key: "B", name: "Header segmented control" },
  { key: "C", name: "Floating button + menu" },
  { key: "D", name: "Header switch, two states" },
];

export type ThemeChoice = "system" | "light" | "dark";

const darkQuery = "(prefers-color-scheme: dark)";
function subscribeToOs(onChange: () => void) {
  const query = window.matchMedia(darkQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function osIsDark() {
  return window.matchMedia(darkQuery).matches;
}

export function useThemeChoice() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const osDark = useSyncExternalStore(subscribeToOs, osIsDark, () => false);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === "system") delete root.dataset.theme;
    else root.dataset.theme = choice;
  }, [choice]);

  const showing: "light" | "dark" = choice === "system" ? (osDark ? "dark" : "light") : choice;
  return { choice, setChoice, osDark, showing };
}

export type ThemeControl = ReturnType<typeof useThemeChoice>;

const labels: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match my device",
};

// --- Icons ------------------------------------------------------------------

function Sun() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function Moon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function Monitor() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const icons: Record<ThemeChoice, () => React.JSX.Element> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

// --- A: one icon button in the header; each click moves to the next choice --

const cycle: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };

export function VariantA({ theme }: { theme: ThemeControl }) {
  const Icon = icons[theme.choice];
  const next = cycle[theme.choice];
  return (
    <button
      type="button"
      onClick={() => theme.setChoice(next)}
      aria-label={`Theme: ${labels[theme.choice]}. Switch to ${labels[next]}.`}
      title={`Theme: ${labels[theme.choice]} (click for ${labels[next]})`}
      className="rounded-full p-1.5 hover:bg-line"
    >
      <Icon />
    </button>
  );
}

// --- B: all three choices visible at once, as a segmented control -----------

export function VariantB({ theme }: { theme: ThemeControl }) {
  const order: ThemeChoice[] = ["light", "system", "dark"];
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex rounded-full border border-line p-0.5"
    >
      {order.map((option) => {
        const Icon = icons[option];
        const selected = theme.choice === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={labels[option]}
            title={labels[option]}
            onClick={() => theme.setChoice(option)}
            className={`rounded-full px-2 py-1 ${selected ? "bg-primary text-on-primary" : "text-muted"}`}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

// --- C: out of the header; a floating button bottom-left, mirroring Feedback
// bottom-right, that opens a small menu of worded choices --------------------

export function VariantC({ theme }: { theme: ThemeControl }) {
  const Icon = icons[theme.showing];
  return (
    <>
      <button
        type="button"
        popoverTarget="theme-menu"
        aria-label="Theme"
        title="Theme"
        className="fixed bottom-4 left-4 rounded-full border border-line bg-raised p-2.5 shadow-lg"
      >
        <Icon />
      </button>
      <div
        id="theme-menu"
        popover="auto"
        className="fixed inset-auto bottom-16 left-4 m-0 w-56 rounded-lg border border-line bg-raised p-3 text-ink shadow-xl"
      >
        <fieldset>
          <legend className="mb-2 font-semibold">Theme</legend>
          {(["light", "dark", "system"] as const).map((option) => {
            const OptionIcon = icons[option];
            return (
              <label
                key={option}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-line"
              >
                <input
                  type="radio"
                  name="theme"
                  value={option}
                  checked={theme.choice === option}
                  onChange={() => theme.setChoice(option)}
                />
                <OptionIcon />
                {labels[option]}
              </label>
            );
          })}
        </fieldset>
      </div>
    </>
  );
}

// --- D: a plain on/off switch, light or dark. It starts on whatever the OS
// says; the first click pins it, and there is no way back to "follow the OS".

export function VariantD({ theme }: { theme: ThemeControl }) {
  const dark = theme.showing === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Dark mode is on" : "Dark mode is off"}
      onClick={() => theme.setChoice(dark ? "light" : "dark")}
      className="flex items-center gap-1.5 text-muted"
    >
      <Sun />
      <span
        className={`relative inline-block h-5 w-9 rounded-full border border-line-strong ${dark ? "bg-primary" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${dark ? "left-[1.1rem] bg-on-primary" : "left-0.5 bg-muted"}`}
        />
      </span>
      <Moon />
    </button>
  );
}

export function ThemeToggleState({ variant, theme }: { variant: string; theme: ThemeControl }) {
  const extra = variant === "D" && theme.choice === "system" ? " (not pinned yet)" : "";
  return (
    <>
      choice: {theme.choice}
      {extra} · OS: {theme.osDark ? "dark" : "light"} · showing: {theme.showing}
    </>
  );
}
