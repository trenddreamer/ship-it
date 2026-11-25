// Implementation: private to this module. Import it only from within
// app/modules/example/, never from outside or from tests.
/** Turns a free-text title into a URL-safe slug. */
export function toSlug(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
