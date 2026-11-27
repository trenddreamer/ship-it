import * as fs from "node:fs";
import { prBody } from "./pr-body.ts";

// Usage: node finish-pr-body.ts <home owner/name> <ticket> <run url> [spec] < agent-body.md > body.md
//
// Adds the Factory's footer to the agent's summary, with the Ticket's
// cross-repo `Closes` line, and its spec's if one is given (the spec queue's
// builds). The rule and its tests are in pr-body.ts.
//
// Node runs this file as it is, with no `npm ci`: it imports only Node's
// builtins and `./pr-body.ts`, and uses no TypeScript that Node can't strip.
const [home, ticket, runUrl, spec] = process.argv.slice(2);
if (
  !home?.includes("/") ||
  !/^\d+$/.test(ticket ?? "") ||
  !runUrl ||
  (spec !== undefined && !/^\d+$/.test(spec))
) {
  console.error(
    "Usage: finish-pr-body.ts <home owner/name> <ticket> <run url> [spec] < agent-body.md",
  );
  process.exit(1);
}

process.stdout.write(
  prBody(fs.readFileSync(0, "utf8"), {
    home,
    ticket: Number(ticket),
    runUrl,
    ...(spec === undefined ? {} : { spec: Number(spec) }),
  }),
);
