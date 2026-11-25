// Mutation testing with Stryker: `npm run test:mutation`.
//
// Stryker makes small changes (mutants) to the code under test and reruns
// the tests against each one. A mutant the tests catch is killed. One they
// miss survived, and points at behaviour no test pins down. The mutation
// score is the share killed.
//
// This is a verification tool for agents and people to run on demand. It is
// not part of the pre-commit hook, `npm run check` or CI. See
// docs/agents/mutation-testing.md for how and when to use it.

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.ts" },
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
  // Behaviour lives in modules, so that is what gets mutated. Routes,
  // components and the db scripts hold no business logic, and no test
  // exercises them.
  mutate: ["app/modules/**/*.{ts,tsx}", "!app/modules/*/tests/**"],
  // The target is a score between 85% and 90%. Below 85% the run fails.
  thresholds: { high: 90, low: 85, break: 85 },
  reporters: ["clear-text", "progress", "html", "json"],
  // Survivors are listed either way. The per-test list is noise.
  clearTextReporter: { reportTests: false },
  htmlReporter: { fileName: "reports/mutation/mutation.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  // Reruns only the mutants a change could affect. Pass `--incremental`.
  incrementalFile: "reports/mutation/stryker-incremental.json",
  // More workers than this starve each other, and mutants time out instead
  // of being killed, which inflates the score.
  concurrency: 4,
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
};
