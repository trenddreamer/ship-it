import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { useThemeChoice } from "~/components/theme-toggle";
import { pageTheme } from "~/modules/theme";
import { themeChoiceFromRequest } from "~/modules/theme/server";
import type { Route } from "./+types/root";
import "./app.css";

// The theme the visitor picked, so the server renders the page in it and a
// dark page never flashes light. The header's theme icon reads it too.
export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await themeChoiceFromRequest(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { dataTheme, colorScheme } = pageTheme(useThemeChoice());
  return (
    <html lang="en" data-theme={dataTheme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Lets the browser paint the dark background before the stylesheet loads. */}
        <meta name="color-scheme" content={colorScheme} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    if (error.status === 404) details = "The requested page could not be found.";
    // A thrown Response's body, e.g. the 403 from requireAccount.
    else if (typeof error.data === "string" && error.data) details = error.data;
    else details = error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
