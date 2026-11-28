// Mutation testing for the Factory's scripts: `npm run test:mutation`. It
// mutates the pure rules in .sandcastle/agent-workflows/ that the Factory's
// workflows run, and reruns their Vitest tests against each mutant. See
// docs/agents/mutation-testing.md.

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.ts" },
  checkers: ["typescript"],
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
  thresholds: { high: 90, low: 85, break: 85 },
  reporters: ["clear-text", "progress", "html", "json"],
  clearTextReporter: { reportTests: false },
  htmlReporter: { fileName: "reports/mutation/mutation.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  incrementalFile: "reports/mutation/stryker-incremental.json",
  concurrency: 4,
  tempDirName: ".stryker-tmp",
  ignorePatterns: ["/.claude/worktrees"],
  cleanTempDir: true,
};
