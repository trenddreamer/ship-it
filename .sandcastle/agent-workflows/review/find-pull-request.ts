import * as fs from "node:fs";
import { type OpenPullRequest, ticketPullRequest } from "./pull-request.ts";

// Usage: node find-pull-request.ts <home owner/name> <enrolled owner/name> <ticket> < prs.json
//
// Prints the number of the Factory's open pull request for the Ticket, from
// `gh pr list --json number,body` in the Enrolled repo. Exits 1, saying so,
// when there is none. The rule and its tests are in pull-request.ts.
//
// Node runs this file as it is, with no `npm ci`: it imports only Node's
// builtins and `./pull-request.ts`, and uses no TypeScript that Node can't
// strip.
const [home, enrolled, ticket] = process.argv.slice(2);
if (!home?.includes("/") || !enrolled?.includes("/") || !/^\d+$/.test(ticket ?? "")) {
  console.error("Usage: find-pull-request.ts <home owner/name> <enrolled owner/name> <ticket>");
  process.exit(1);
}

const prs = JSON.parse(fs.readFileSync(0, "utf8")) as OpenPullRequest[];
const found = ticketPullRequest(prs, { home, enrolled, ticket: Number(ticket) });
if (found === undefined) {
  console.error(`No open pull request in ${enrolled} closes ${home}#${ticket}.`);
  process.exit(1);
}
process.stdout.write(`${found}\n`);
