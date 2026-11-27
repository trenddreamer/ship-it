import * as fs from "node:fs";
import { type RoutedTicket, batches } from "./batch.ts";

// Usage: node batch-tickets.ts <home owner/name> < routes.json > batches.json
//
// Groups the routed Tickets by Enrolled repo, one batch per repo. routes.json
// is what route-tickets.ts writes. Each batch is `{ repo, tickets, owner,
// repositories }`: the last two scope that batch's Factory App token.
//
// Node runs this file as it is, with no `npm ci`: it imports only Node's
// builtins and `./batch.ts`, and uses no TypeScript that Node can't strip.
const home = process.argv[2];
if (!home?.includes("/")) {
  console.error("Usage: batch-tickets.ts <home owner/name> < routes.json");
  process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(0, "utf8")) as RoutedTicket[];
process.stdout.write(JSON.stringify(batches(routes, home)));
