// Fixture: loads nothing the browser lacks. A Node built-in used only as a
// type is erased before bundling.
import type { Hash } from "node:crypto";
import { toSlug } from "~/modules/example";

export const slug = (hash: Hash | undefined) => (hash ? toSlug("hashed") : toSlug("plain"));
