# Coding standards

Each rule is a heading. Reviewers cite a rule by its heading. A breach of any rule here is a hard violation, unless the rule says it is a judgement call.

## Modules

Behaviour lives in deep modules under `app/modules/`: a lot of behaviour behind a small interface. The layout and the reasoning are in [app/modules/README.md](./app/modules/README.md). In short, a module's root files are its **entry points** (public), and everything in its subfolders (`lib/`, `tests/`, anything else) is **private**.

### How the boundaries are enforced

The first line of defense is [dependency-cruiser](https://github.com/sverweij/dependency-cruiser). Its config is `.dependency-cruiser.cjs`, and `npm run lint:boundaries` runs it (it is also part of `npm run check`). It fails the build when:

- code outside a module imports anything in that module's subfolders (`entrypoint-boundary-from-app`, `entrypoint-boundary-across-packages`);
- a test in `<module>/tests/` imports any module's subfolder internals, including its own (`tests-through-entrypoints`);
- anything other than a test imports from a `tests/` folder (`tests-folder-is-private`);
- a test file (`*.test.ts` and friends) sits anywhere other than `<module>/tests/` (`tests-live-in-tests-folder`);
- there is a dependency cycle (`no-circular`).

A module's own files import each other freely. The linter checks type-only imports (`import type`) as well as value imports.

These standards are the second line of defense. The linter only sees static import statements, so every rule below covers a way past the boundary that it does **not** catch. Reviewers: don't skip these on the grounds that tooling enforces boundaries. It doesn't enforce these.

### Behaviour goes in a module, not a route

New behaviour goes in a module under `app/modules/`, behind an entry point a test can call. Loaders, actions and components call modules. They don't contain business logic themselves.

### Don't weaken the boundary check

A diff must not loosen the checker. That means it must not:

- add `pathNot` exceptions, drop rules, or lower a rule's `severity` in `.dependency-cruiser.cjs`;
- narrow what `lint:boundaries` cruises (it runs `depcruise app`), or remove it from `check`;
- put app code outside `app/`, where it isn't cruised.

Tightening the check is fine, e.g. adding a layering rule. Any other change to `.dependency-cruiser.cjs` or those scripts needs a reason in the ticket, and a human should sign it off.

### Keep the checker able to see the code

dependency-cruiser needs a TypeScript version it supports to read `.ts` files, and to see type-only imports. It currently supports 6.x and 7.1+, but **not 7.0**. On an unsupported version it doesn't fail. It reports `no dependency violations found (0 modules ... cruised)`. After any change to TypeScript, `tsconfig.json` or the dependency-cruiser version, run `npm run lint:boundaries` and check that it cruised more than 0 modules. A 0-module run is a failure, not a pass.

### Import through entry points, by every route

The linter checks `import ... from` statements. These reach internals without it noticing, and are banned from outside a module just the same:

- Dynamic `import()` or `require()` with a computed or template path.
- Any path string that names another module's internals, e.g. in config or a test helper.

### Tests live in `tests/` and go through the entry points

- Test files live in `<module>/tests/`, nowhere else. The linter enforces this only for files named `*.test.*`. A test named any other way (e.g. `*.spec.ts`) slips past it, so name every test `*.test.ts` or `*.test.tsx`.
- Don't `vi.mock` (or otherwise stub) another file by a path into a module's subfolder, including the module under test. `vi.mock("../lib/impl")` couples the test to internals and the linter can't see it. Mock only at the module's seams: the things it receives or the modules it imports through their entry points.
- Don't add an export to an entry point just so a test can reach it. If a test needs it, either it is part of the interface or the test should go through the interface that uses it.

### Entry points are small and deliberate

The public surface is every root file, so:

- Don't re-export a subfolder wholesale (`export * from "./lib/..."`). That's a barrel that turns the internals public without the linter noticing. Export by name, only what callers need.
- Moving a file from a subfolder to the module root makes it public. Do it only when it is meant to be part of the interface.
- Prefer several small entry points (`index.ts`, `client.ts`, `server.ts`) to one large `index.ts`.

### Modules are deep

_Judgement call._ An entry point should hide real behaviour. A module whose entry points just pass straight through to `lib/`, or whose interface is nearly as large as its implementation, is shallow. Fold it into its caller, or move more behaviour behind the interface.

### Modules are flat

Every folder directly under `app/modules/` is a module. Don't nest a module inside another. Shared code that several modules need becomes its own module with its own entry points, not a shared folder that others reach into.
