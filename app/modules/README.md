# Modules

Every folder under `app/modules/` is a **deep module**: a lot of behaviour behind a small interface. The files at a module's root are its **entry points**, its public interface. Everything in its subfolders is hidden.

```
app/modules/
  <name>/
    index.ts        ← an entry point (public). Import this from outside.
    client.ts       ← the entry point for the browser: what components may import.
    server.ts       ← another entry point. A module may expose several.
    lib/            ← implementation: hidden from outside, free to import each other.
    tests/          ← tests + fixtures, exercising the module through its entry points.
```

Start a new module by copying `example/`.

## Rules

`npm run lint:boundaries` enforces these with [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) (config: `.dependency-cruiser.cjs`). It also runs as part of `npm run check`.

**Import only through entry points.** Code outside a module, whether app code or another module, may import only that module's root files, never anything inside its subfolders.

**Inside a module, anything goes.** A module's own files import each other freely.

**Tests go through the entry points too.** Files in `<module>/tests/` may import any module's entry points and their own `tests/` fixtures, but never any module's internals, not even their own. Integration tests across modules are fine; deep imports are not.

**Tests live in `tests/`.** A `*.test.*` file anywhere else in `app/` fails the check: outside `tests/` it would count as the module's own code and could reach internals unchecked.

**No cycles.** No dependency cycles anywhere.

**Components import values only through `client.ts`.** A file under `app/components/` runs in the browser, so it imports a module's functions and constants from `~/modules/<name>/client`, never from `index.ts` or `server.ts`. Type-only imports (`import type`) may use any entry point, because TypeScript erases them. b7e92f9 shows why: a component imported from `~/modules/accounts`, whose `index.ts` brings in password hashing (`node:crypto`), and the Vendor pages stopped hydrating.

Apart from that one exception for components, the rules above check type-only imports (`import type`) too. [CODING_STANDARDS.md](../../CODING_STANDARDS.md) covers the routes past these rules that the linter can't see.

## Client entry points

A `client.ts` exposes what the browser may use from a module: pure functions, constants and types. It must not import, directly or through anything it loads, a Node built-in (`node:crypto`, `node:fs`, …), the database (`~/db/database` or a driver such as `@libsql/client`), or the module's `index.ts` or `server.ts`. Re-export from `lib/` files that stay clear of those. Importing constants from `~/db/schema` is allowed for now: it loads Drizzle's table builders, which run in the browser. A module's `tests/client.test.ts` checks this for its `client.ts` by calling `browserUnsafeDependencies` from `~/modules/browser-safety`, which lists any Node built-in, database driver or `*.server.ts` file the entry point loads.

## No barrel files

Don't build an `index.ts` that re-exports a whole subtree. Every root file is already an entry point, so expose several small ones (`index.ts`, `client.ts`, `server.ts`) and keep the implementation in subfolders. Modules are flat: one level under `app/modules/`, never a module inside a module.
