import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// currentCommit runs git, so each test points git at a throwaway repo it sets
// up (with GIT_DIR and GIT_WORK_TREE, as test workers can't change
// directory), and loads the module afresh, since the value is computed once
// per process.

const VERCEL = "4ea5a8a0f1e2d3c4b5a69788796a5b4c3d2e1f00";
const FLAG = " (local changes not on main)";

let directory: string;

function git(...args: string[]): string {
  return execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "-c",
      "commit.gpgsign=false",
    ].concat(args),
    { cwd: directory, encoding: "utf8" },
  );
}

/** A repo with one commit, which `origin/main` points at. */
function repoOnMain(): string {
  git("init", "--quiet");
  git("commit", "--quiet", "--allow-empty", "-m", "First");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  return git("rev-parse", "--short=7", "HEAD").trim();
}

async function currentCommitHere(): Promise<string> {
  vi.resetModules();
  const { currentCommit } = await import("../server");
  vi.stubEnv("GIT_DIR", join(directory, ".git"));
  vi.stubEnv("GIT_WORK_TREE", directory);
  return currentCommit();
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "current-commit-"));
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("currentCommit", () => {
  it("gives the short HEAD SHA alone for a clean HEAD on origin/main", async () => {
    const head = repoOnMain();
    expect(await currentCommitHere()).toBe(head);
  });

  it("flags uncommitted changes", async () => {
    const head = repoOnMain();
    writeFileSync(join(directory, "notes.txt"), "not committed");
    expect(await currentCommitHere()).toBe(head + FLAG);
  });

  it("flags commits not on origin/main", async () => {
    repoOnMain();
    git("commit", "--quiet", "--allow-empty", "-m", "Second");
    const head = git("rev-parse", "--short=7", "HEAD").trim();
    expect(await currentCommitHere()).toBe(head + FLAG);
  });

  it("doesn't flag a clean HEAD when there's no origin/main", async () => {
    git("init", "--quiet");
    git("commit", "--quiet", "--allow-empty", "-m", "First");
    const head = git("rev-parse", "--short=7", "HEAD").trim();
    expect(await currentCommitHere()).toBe(head);
  });

  it("gives unknown for a repo with no commits", async () => {
    git("init", "--quiet");
    expect(await currentCommitHere()).toBe("unknown");
  });

  it("gives unknown, without throwing, outside a repo", async () => {
    expect(await currentCommitHere()).toBe("unknown");
  });

  it("gives unknown, without throwing, when git can't be found", async () => {
    repoOnMain();
    vi.stubEnv("PATH", "");
    expect(await currentCommitHere()).toBe("unknown");
  });

  it("uses the short Vercel SHA, unflagged, when it's set", async () => {
    repoOnMain();
    writeFileSync(join(directory, "notes.txt"), "not committed");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", VERCEL);
    expect(await currentCommitHere()).toBe("4ea5a8a");
  });

  it("computes the value once per process", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", VERCEL);
    vi.resetModules();
    const { currentCommit } = await import("../server");
    expect(currentCommit()).toBe("4ea5a8a");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "0000000ffff");
    expect(currentCommit()).toBe("4ea5a8a");
  });
});
