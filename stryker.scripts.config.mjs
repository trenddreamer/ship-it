// Mutation testing for the agent scripts: `npm run test:mutation:scripts`.
//
// stryker.config.mjs mutates the app's modules. This mutates the pure rules
// in .sandcastle/agent-workflows/ that the Factory's workflows run, each with
// its tests next to it. Everything else is as there; see
// docs/agents/mutation-testing.md.
import base from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...base,
  // The scripts' own tsconfig: they import each other with `.ts` on the path.
  tsconfigFile: ".sandcastle/agent-workflows/tsconfig.json",
  // The files with tests next to them. Add one here when you give it tests.
  // The CLIs around them (route-tickets.ts, finish-pr-body.ts, ...) only do
  // I/O, and the Sandcastle scripts run an agent; no test exercises either.
  mutate: [
    ".sandcastle/agent-workflows/route/route.ts",
    ".sandcastle/agent-workflows/shared/evidence.ts",
    ".sandcastle/agent-workflows/route/batch.ts",
    ".sandcastle/agent-workflows/implement-spec/survey.ts",
    ".sandcastle/agent-workflows/implement/pr-body.ts",
    ".sandcastle/agent-workflows/review/verdict.ts",
    ".sandcastle/agent-workflows/review/pull-request.ts",
    ".sandcastle/agent-workflows/review/fallback-body.ts",
    ".sandcastle/agent-workflows/review/left-findings.ts",
    ".sandcastle/agent-workflows/shared/steering-comments.ts",
  ],
  htmlReporter: { fileName: "reports/mutation-scripts/mutation.html" },
  jsonReporter: { fileName: "reports/mutation-scripts/mutation.json" },
  incrementalFile: "reports/mutation-scripts/stryker-incremental.json",
};
