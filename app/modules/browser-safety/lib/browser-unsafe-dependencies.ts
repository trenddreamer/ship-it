import { cruise } from "dependency-cruiser";

/** A database driver: a package that opens SQLite files, which the browser can't do. */
const DATABASE_DRIVER = /node_modules\/(@libsql\/|drizzle-orm\/libsql\/)/;

/** Server-only app code, by the `.server.ts` naming React Router keeps out of the browser. */
const SERVER_ONLY_FILE = /\.server\./;

/**
 * Everything `entry` loads at run time, however indirectly, that would break
 * or bloat the browser bundle: Node built-ins (`node:crypto`, …), database
 * drivers and `*.server.ts` files. Types are erased first, as they are for the
 * bundle, so an `import type` is never reported. An empty list means `entry`
 * is safe for the browser. Paths are relative to the repo root.
 *
 * The tests in this module check that unsafe fixtures are reported, so a
 * dependency-cruiser that reads nothing (an unsupported TypeScript) fails them
 * rather than passing every `client.ts`.
 */
export async function browserUnsafeDependencies(entry: string): Promise<string[]> {
  const result = await cruise([entry], {
    tsPreCompilationDeps: false,
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
  });
  if (typeof result.output === "string") throw new Error("expected cruise results");
  return result.output.modules
    .filter(
      (module) =>
        module.coreModule === true ||
        DATABASE_DRIVER.test(module.source) ||
        SERVER_ONLY_FILE.test(module.source),
    )
    .map((module) => module.source);
}
