# Modules

Every folder under `app/modules/` is a **deep module**: a lot of behaviour behind a small interface. The files at a module's root are its **entry points**, its public interface. Everything in its subfolders is hidden.

```
app/modules/
  <name>/
    index.ts        ← an entry point (public). Import this from outside.
    client.ts       ← another entry point. A module may expose several.
    lib/            ← implementation: hidden from outside, free to import each other.
    tests/          ← tests + fixtures, exercising the module through its entry points.
```

Start a new module by copying `example/`.

## Rules

`npm run lint:boundaries` enforces these with [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) (config: `.dependency-cruiser.cjs`). It also runs as part of `npm run check`.

**Import only through entry points.** Code outside a module, whether app code or another module, may import only that module's root files, never anything inside its subfolders.

**Inside a module, anything goes.** A module's own files import each other freely.

**Tests go through the entry points too.** Files in `<module>/tests/` may import any module's entry points and their own `tests/` fixtures, but never any module's internals, not even their own. Integration tests across modules are fine; deep imports are not.

**No cycles.** No dependency cycles anywhere.

## No barrel files

Don't build an `index.ts` that re-exports a whole subtree. Every root file is already an entry point, so expose several small ones (`index.ts`, `client.ts`, `server.ts`) and keep the implementation in subfolders. Modules are flat: one level under `app/modules/`, never a module inside a module.
