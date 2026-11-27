import { fallbackBody } from "./fallback-body.ts";

// Usage: node write-fallback-body.ts <home owner/name> <ticket> <pr> <branch> <base> <default branch> <run url> > body.md
//
// The body of the pull request the review opens when its push to the
// reviewed pull request's branch is rejected. The rule and its tests are in
// fallback-body.ts.
//
// Node runs this file as it is, with no `npm ci`: it imports only
// `./fallback-body.ts`, and uses no TypeScript that Node can't strip.
const [home, ticket, pr, branch, base, defaultBranch, runUrl] = process.argv.slice(2);
if (
  !home?.includes("/") ||
  !/^\d+$/.test(ticket ?? "") ||
  !/^\d+$/.test(pr ?? "") ||
  !branch ||
  !base ||
  !defaultBranch ||
  !runUrl
) {
  console.error(
    "Usage: write-fallback-body.ts <home owner/name> <ticket> <pr> <branch> <base> <default branch> <run url>",
  );
  process.exit(1);
}

process.stdout.write(
  fallbackBody({
    home,
    ticket: Number(ticket),
    pr: Number(pr),
    branch,
    base,
    defaultBranch,
    runUrl,
  }),
);
