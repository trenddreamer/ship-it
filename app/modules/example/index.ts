// Entry point: the only way into this module from outside.
// Copy this folder to start a new module, or delete it.
import { slugify } from "./lib/impl";

/** Turns a free-text title into a URL-safe slug. */
export function toSlug(title: string): string {
  return slugify(title);
}
