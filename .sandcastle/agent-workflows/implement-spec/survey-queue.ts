import * as fs from "node:fs";
import { type QueuedTicket, survey } from "./survey.ts";

// Usage: node survey-queue.ts <spec.json> < queue.json > survey.json
//
// spec.json is `gh issue view <spec> --json labels`; queue.json is
// `gh issue list --label spec:<spec> --json number,state,labels,body`. Writes
// what the spec queue does next. The rule and its tests are in survey.ts.
//
// Node runs this file as it is, with no `npm ci`: it imports only Node's
// builtins and `./survey.ts`, and uses no TypeScript that Node can't strip.
const specFile = process.argv[2];
if (!specFile) {
  console.error("Usage: survey-queue.ts <spec.json> < queue.json");
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specFile, "utf8")) as { labels: { name: string }[] };
const queue = JSON.parse(fs.readFileSync(0, "utf8")) as QueuedTicket[];
process.stdout.write(JSON.stringify(survey({ labels: spec.labels.map((l) => l.name) }, queue)));
