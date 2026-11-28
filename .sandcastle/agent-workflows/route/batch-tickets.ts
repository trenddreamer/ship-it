import * as fs from "node:fs";
import { type RoutedTicket, batches } from "./batch.ts";

// Usage: node batch-tickets.ts < routes.json > batches.json
//
// Groups the routed Tickets by Enrolled repo, one batch per repo. routes.json
// is what route-tickets.ts writes. Each batch is `{ repo, tickets, owner,
// name }`: the last two scope the token that dispatches that batch's run.
//
// Node runs this file as it is, with no `npm ci`: it imports only Node's
// builtins and `./batch.ts`, and uses no TypeScript that Node can't strip.
const routes = JSON.parse(fs.readFileSync(0, "utf8")) as RoutedTicket[];
process.stdout.write(JSON.stringify(batches(routes)));
