import * as path from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import { claudeAgent, required } from "../shared/common";

// The agent edits files and commits them itself, so the repo's pre-commit
// hook runs on its work and it has to fix whatever the hook rejects. It does
// not push or open the PR, and it holds no GitHub token to do either — the
// workflow steps after this one do, where you can read them.
//
// CHECK is the Enrolled repo's Contract `check`, the checks its change must
// pass. The prompt names it, so the agent runs that repo's checks, not ours.
await sandcastle.run({
  name: "implement",
  agent: claudeAgent(),
  sandbox: noSandbox(),
  logging: { type: "stdout" },
  promptFile: path.join(import.meta.dirname, "prompt.md"),
  promptArgs: { CHECK: required("CHECK") },
});
