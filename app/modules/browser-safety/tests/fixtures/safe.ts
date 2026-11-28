// Fixture: loads nothing the browser lacks. A Node built-in used only as a
// type is erased before bundling.
import type { Hash } from "node:crypto";
import { toLabel } from "~/modules/browser-safety/tests/fixtures/plain";

export const label = (hash: Hash | undefined) => (hash ? toLabel("hashed") : toLabel("plain"));
