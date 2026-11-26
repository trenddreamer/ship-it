// The theme icon at the end of the header, on every page. It shows the theme
// picked (a sun, a moon, or a screen for Match my device) and each click
// moves on to the next: Match my device, Light, Dark, and round again.
import { useFetcher, useRouteLoaderData } from "react-router";
import { nextThemeChoice, type ThemeChoice } from "~/modules/theme";

// One fetcher, shared by key with useThemeChoice, so the page switches the
// moment the icon is clicked rather than when the cookie comes back.
const fetcherKey = "theme";

const labels: Record<ThemeChoice, string> = {
  system: "Match my device",
  light: "Light",
  dark: "Dark",
};

/**
 * The theme picked: the one being saved while a click is on its way, else
 * the one the root loader read from the cookie.
 */
export function useThemeChoice(): ThemeChoice {
  // Typed here rather than from root.tsx's loader: root imports this file.
  const saved = (useRouteLoaderData("root") as { theme: ThemeChoice } | undefined)?.theme;
  const saving = useFetcher({ key: fetcherKey }).formData?.get("theme");
  return (saving as ThemeChoice | undefined) ?? saved ?? "system";
}

export function ThemeToggle() {
  const fetcher = useFetcher({ key: fetcherKey });
  const choice = useThemeChoice();
  const next = nextThemeChoice(choice);
  const Icon = icons[choice];
  return (
    <fetcher.Form method="post" action="/theme" className="flex">
      <input type="hidden" name="theme" value={next} />
      <button
        type="submit"
        aria-label={`Theme: ${labels[choice]}. Switch to ${labels[next]}.`}
        title={`Theme: ${labels[choice]} (click for ${labels[next]})`}
        className="flex rounded-full p-2 hover:bg-line"
      >
        <Icon />
      </button>
    </fetcher.Form>
  );
}

function Sun() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
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
      width="20"
      height="20"
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

function Screen() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
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
  system: Screen,
  light: Sun,
  dark: Moon,
};
