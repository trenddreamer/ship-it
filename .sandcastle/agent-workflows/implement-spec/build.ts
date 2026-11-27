import * as path from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { claudeAgent, required } from "../shared/common";

// Like the one-off implementer: the agent edits and commits, through the
// repo's pre-commit hook if it has one; the workflow pushes and opens the PR.
//
// CHECK is the Enrolled repo's Contract `check`. The prompt names it, so the
// agent runs that repo's checks, not ours.
await sandcastle.run({
  name: "build-ticket",
  agent: claudeAgent(),
  sandbox: noSandbox(),
  logging: { type: "stdout" },
  promptFile: path.join(import.meta.dirname, "build-prompt.md"),
  promptArgs: { CHECK: required("CHECK") },
});
