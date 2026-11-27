import * as fs from "node:fs";
import { verdictOutcome } from "./verdict.ts";

// Usage: node verdict-outcome.ts < /tmp/review-verdict.md
//
// Prints `pass`, `changes-requested` or `none`. The rule and its tests are in
// verdict.ts.
//
// Node runs this file as it is, with no `npm ci`: it imports only Node's
// builtins and `./verdict.ts`.
process.stdout.write(`${verdictOutcome(fs.readFileSync(0, "utf8"))}\n`);
