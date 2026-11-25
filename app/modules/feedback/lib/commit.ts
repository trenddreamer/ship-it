import { spawnSync } from "node:child_process";

/** What commit detection knows. Any input it couldn't find is left out. */
export type CommitInputs = {
  /**
   * `VERCEL_GIT_COMMIT_SHA`, set when the Marketplace runs on Vercel. Empty
   * counts as missing.
   */
  vercelSha?: string;
  /** The full SHA of the local `HEAD`. Empty counts as missing. */
  headSha?: string;
  /** Whether the working tree has uncommitted changes. */
  hasUncommittedChanges?: boolean;
  /** Whether `HEAD` has commits that aren't on `origin/main`. */
  hasCommitsNotOnMain?: boolean;
};

const SHORT_SHA_LENGTH = 7;

/**
 * The value of the Feedback footer's `Commit:` line, from inputs the caller
 * gathered.
 *
 * On Vercel it's the short Vercel SHA, with no flag. Locally it's the short
 * `HEAD` SHA, flagged ` (local changes not on main)` when the working tree
 * has uncommitted changes or `HEAD` has commits not on `origin/main`. With
 * neither, it's `unknown`.
 */
export function commitLine(inputs: CommitInputs): string {
  const { vercelSha, headSha } = inputs;
  if (vercelSha) return vercelSha.slice(0, SHORT_SHA_LENGTH);
  if (!headSha) return "unknown";
  const short = headSha.slice(0, SHORT_SHA_LENGTH);
  return inputs.hasUncommittedChanges || inputs.hasCommitsNotOnMain
    ? `${short} (local changes not on main)`
    : short;
}

/** Runs git, giving its output, or "" when it fails or can't be found. */
function git(...args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout : "";
}

/**
 * Gathers the real inputs: the Vercel variable and three git commands. A
 * failed command gives "", which `commitLine` reads as that input missing.
 */
function gatherInputs(): CommitInputs {
  return {
    vercelSha: process.env.VERCEL_GIT_COMMIT_SHA,
    headSha: git("rev-parse", "HEAD"),
    hasUncommittedChanges: git("status", "--porcelain") !== "",
    hasCommitsNotOnMain: git("rev-list", "origin/main..HEAD") !== "",
  };
}

let cached: string | undefined;

/**
 * The commit the Marketplace is running, for the Feedback footer: see
 * `commitLine`. Computed once per process. A failing git (none installed, no
 * repo, no `origin/main`) counts as that input missing, never as an error.
 */
export function currentCommit(): string {
  cached ??= commitLine(gatherInputs());
  return cached;
}
