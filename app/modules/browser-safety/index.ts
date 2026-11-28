// Entry point: whether a file is safe to load in the browser. Each module's
// `tests/client.test.ts` calls this on its `client.ts` (see
// app/modules/README.md, "Client entry points"). Only tests use it.
export { browserUnsafeDependencies } from "./lib/browser-unsafe-dependencies";
