import * as fs from "node:fs";
import { type Registry, route } from "./route.ts";

// Usage: node route-tickets.ts <registry.json> < tickets.json > routes.json
//
// Routes each Ticket. The Registry is `repos.yml` as JSON (`yq -o=json
// repos.yml`). The Tickets are what `gh issue view --json number,labels`
// gives, in an array. Writes one entry per Ticket, in order:
// `{ number, repo }` for a routed one, `{ number, refusal }` for a refused one.
//
// Node runs this file as it is, with no `npm ci`: it imports only Node's
// builtins and `./route.ts`, and uses no TypeScript that Node can't strip.
type Ticket = { number: number; labels: { name: string }[] };

const registryPath = process.argv[2];
if (!registryPath) {
  console.error("Usage: route-tickets.ts <registry.json> < tickets.json");
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8")) as Registry;
const tickets = JSON.parse(fs.readFileSync(0, "utf8")) as Ticket[];

const routes = tickets.map(({ number, labels }) => ({
  number,
  ...route(
    labels.map((l) => l.name),
    registry,
  ),
}));
process.stdout.write(JSON.stringify(routes, null, 2));
