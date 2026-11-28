import * as fs from "node:fs";
import { type IssueComment, steeringComments } from "./steering-comments";

// Usage: keep-steering-comments.ts <factory-bot-login> < comments.json
//
// Reads a Ticket's comments from stdin, as GitHub's REST API returns them,
// and writes the ones that may reach an agent to stdout, as JSON. The login
// is the Factory App's `<slug>[bot]`. Without it the Factory's own findings
// would be dropped, so a missing login is an error, not an empty filter.
const factoryBot = process.argv[2];
if (!factoryBot?.endsWith("[bot]")) {
  console.error("Usage: keep-steering-comments.ts <slug>[bot] < comments.json");
  process.exit(1);
}

const comments = JSON.parse(fs.readFileSync(0, "utf8")) as IssueComment[];
process.stdout.write(JSON.stringify(steeringComments(comments, factoryBot), null, 2));
