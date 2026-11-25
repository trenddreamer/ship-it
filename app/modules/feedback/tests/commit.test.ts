import { describe, expect, it } from "vitest";
import { commitLine } from "../server";

const HEAD = "d9233d3a1b2c3d4e5f60718293a4b5c6d7e8f901";
const VERCEL = "4ea5a8a0f1e2d3c4b5a69788796a5b4c3d2e1f00";

describe("commitLine", () => {
  it("gives the short Vercel SHA, unflagged, even when git says there are local changes", () => {
    expect(
      commitLine({
        vercelSha: VERCEL,
        headSha: HEAD,
        hasUncommittedChanges: true,
        hasCommitsNotOnMain: true,
      }),
    ).toBe("4ea5a8a");
  });

  it("gives the short Vercel SHA when git gave nothing", () => {
    expect(commitLine({ vercelSha: VERCEL })).toBe("4ea5a8a");
  });

  it("gives the short HEAD SHA alone for a clean HEAD on main", () => {
    expect(
      commitLine({ headSha: HEAD, hasUncommittedChanges: false, hasCommitsNotOnMain: false }),
    ).toBe("d9233d3");
  });

  it("flags uncommitted changes", () => {
    expect(
      commitLine({ headSha: HEAD, hasUncommittedChanges: true, hasCommitsNotOnMain: false }),
    ).toBe("d9233d3 (local changes not on main)");
  });

  it("flags commits not on origin/main", () => {
    expect(
      commitLine({ headSha: HEAD, hasUncommittedChanges: false, hasCommitsNotOnMain: true }),
    ).toBe("d9233d3 (local changes not on main)");
  });

  it("doesn't flag a HEAD whose other git results are missing", () => {
    expect(commitLine({ headSha: HEAD })).toBe("d9233d3");
  });

  it("treats an empty HEAD SHA as missing", () => {
    expect(commitLine({ headSha: "", hasUncommittedChanges: true })).toBe("unknown");
  });

  it("ignores an empty Vercel SHA", () => {
    expect(commitLine({ vercelSha: "", headSha: HEAD })).toBe("d9233d3");
  });

  it("gives unknown when nothing is available", () => {
    expect(commitLine({})).toBe("unknown");
    expect(commitLine({ hasUncommittedChanges: true, hasCommitsNotOnMain: true })).toBe("unknown");
  });
});
