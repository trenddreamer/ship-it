import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { giveFeedback, loggingTracker } from "../server";
import {
  addAccount,
  failingTracker,
  feedbackRows,
  freshDatabase,
  recordingTracker,
} from "./fixtures";

const page = "/products/12/subscribe";
const commit = "d9233d3 (local changes not on main)";

async function setUp(kind: "customer" | "vendor" | "admin" = "customer") {
  const database = await freshDatabase();
  const account = await addAccount(database, `someone-${kind}@example.test`, kind);
  return { database, account };
}

async function titleFor(text: string) {
  const { database, account } = await setUp();
  const tracker = recordingTracker();
  await giveFeedback(database, tracker, { account, text, page, commit });
  return tracker.onlyIssue().title;
}

describe("giving Feedback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  describe("its text, trimmed, must be 10 to 2,000 characters", () => {
    it.each([
      ["empty", ""],
      ["9 characters", "123456789"],
      ["9 characters once trimmed", "   123456789 \n\t "],
    ])("refuses text that's %s, and records nothing", async (_, text) => {
      const { database, account } = await setUp();
      const tracker = recordingTracker();

      const result = await giveFeedback(database, tracker, { account, text, page, commit });

      expect(result).toEqual({ kind: "invalid", reason: "Write at least 10 characters." });
      expect(tracker.issues).toEqual([]);
      expect(await feedbackRows(database)).toEqual([]);
    });

    it("refuses text over 2,000 characters, saying how long it is", async () => {
      const { database, account } = await setUp();
      const tracker = recordingTracker();

      const result = await giveFeedback(database, tracker, {
        account,
        text: "a".repeat(2001),
        page,
        commit,
      });

      expect(result).toEqual({
        kind: "invalid",
        reason: "Keep it to 2,000 characters or fewer; it's 2,001.",
      });
      expect(tracker.issues).toEqual([]);
      expect(await feedbackRows(database)).toEqual([]);
    });

    it.each([
      ["exactly 10 characters", "1234567890"],
      ["exactly 2,000 characters", "a".repeat(2000)],
      ["2,000 characters once trimmed", `  ${"a".repeat(2000)}\n `],
    ])("accepts text that's %s", async (_, text) => {
      const { database, account } = await setUp();
      const tracker = recordingTracker();

      const result = await giveFeedback(database, tracker, { account, text, page, commit });

      expect(result).toEqual({ kind: "sent" });
      expect(tracker.issues).toHaveLength(1);
      expect(await feedbackRows(database)).toHaveLength(1);
    });
  });

  describe("the issue's title", () => {
    it("is `Feedback: ` and the text's first line", async () => {
      expect(await titleFor("  The Subscribe button\nis hidden behind the footer")).toBe(
        "Feedback: The Subscribe button",
      );
    });

    it("skips blank lines before the text, and spaces around its first line", async () => {
      expect(await titleFor("\n\n  The Subscribe button   \nis hidden")).toBe(
        "Feedback: The Subscribe button",
      );
    });

    it("takes the first line of text typed on Windows", async () => {
      expect(await titleFor("The Subscribe button\r\nis hidden")).toBe(
        "Feedback: The Subscribe button",
      );
    });

    it("keeps a first line of 70 characters whole", async () => {
      const line = "b".repeat(70);
      expect(await titleFor(line)).toBe(`Feedback: ${line}`);
    });

    it("cuts a longer first line to 70 characters and adds …", async () => {
      expect(await titleFor(`${"c".repeat(70)}d and more`)).toBe(`Feedback: ${"c".repeat(70)}…`);
    });

    it("doesn't leave a space before the …", async () => {
      expect(await titleFor(`${"e".repeat(69)} word`)).toBe(`Feedback: ${"e".repeat(69)}…`);
    });
  });

  describe("the issue's body", () => {
    it("is the text exactly as typed, then a footer with the page, kind of Account and commit", async () => {
      const { database, account } = await setUp();
      const tracker = recordingTracker();
      const text = "  The price shows twice.\n\nOnce in the header, once below.  ";

      await giveFeedback(database, tracker, { account, text, page, commit });

      expect(tracker.onlyIssue().body).toBe(
        `${text}\n\n---\nPage: /products/12/subscribe\nSent by: a Customer\nCommit: d9233d3 (local changes not on main)`,
      );
    });

    it.each([
      ["customer", "Sent by: a Customer"],
      ["vendor", "Sent by: a Vendor"],
      ["admin", "Sent by: an Admin"],
    ] as const)("says a %s Account sent it as %j", async (kind, line) => {
      const { database, account } = await setUp(kind);
      const tracker = recordingTracker();

      await giveFeedback(database, tracker, {
        account,
        text: "Something is off here.",
        page,
        commit,
      });

      expect(tracker.onlyIssue().body.split("\n")).toContain(line);
    });

    it.each(["customer", "vendor", "admin"] as const)(
      "never names a %s Account: no email address and no id",
      async (kind) => {
        const { database, account } = await setUp(kind);
        const tracker = recordingTracker();
        const text = "Something is off here.";

        await giveFeedback(database, tracker, { account, text, page: "/inbox", commit: "abc1234" });

        const footer = tracker.onlyIssue().body.slice(text.length);
        expect(footer).not.toContain(account.email);
        expect(footer).not.toContain("someone");
        expect(footer).not.toMatch(new RegExp(`\\b${account.id}\\b`));
        expect(tracker.onlyIssue().title).not.toContain(account.email);
      },
    );
  });

  it("labels the issue exactly `agent:explore` and `feedback`", async () => {
    const { database, account } = await setUp();
    const tracker = recordingTracker();

    await giveFeedback(database, tracker, {
      account,
      text: "Something is off here.",
      page,
      commit,
    });

    expect(tracker.onlyIssue().labels).toEqual(["agent:explore", "feedback"]);
  });

  describe("once sent", () => {
    it("records one row with the Account and the time, and passes the issue's URL through", async () => {
      const { database, account } = await setUp();
      const tracker = recordingTracker("https://github.com/trenddreamer/ship-it/issues/99");
      const before = Date.now();

      const result = await giveFeedback(database, tracker, {
        account,
        text: "Something is off here.",
        page,
        commit,
      });

      expect(result).toEqual({
        kind: "sent",
        issueUrl: "https://github.com/trenddreamer/ship-it/issues/99",
      });
      const rows = await feedbackRows(database);
      expect(rows).toEqual([
        { id: expect.any(Number), accountId: account.id, givenAt: expect.any(Date) },
      ]);
      const givenAt = rows[0]!.givenAt.getTime();
      expect(givenAt).toBeGreaterThanOrEqual(before - 1000);
      expect(givenAt).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it("records the Account that gave it, not another", async () => {
      const { database, account } = await setUp();
      const other = await addAccount(database, "other@example.test", "admin");
      const input = { text: "Something is off here.", page, commit };

      await giveFeedback(database, recordingTracker(), { ...input, account: other });
      await giveFeedback(database, recordingTracker(), { ...input, account });

      const rows = await feedbackRows(database);
      expect(rows.map((row) => row.accountId)).toEqual([other.id, account.id]);
    });

    it("returns no URL when the tracker has none", async () => {
      const { database, account } = await setUp();

      const result = await giveFeedback(database, recordingTracker(), {
        account,
        text: "Something is off here.",
        page,
        commit,
      });

      expect(result).toStrictEqual({ kind: "sent" });
      expect(await feedbackRows(database)).toHaveLength(1);
    });

    it("records a row each time", async () => {
      const { database, account } = await setUp();
      const input = { account, text: "Something is off here.", page, commit };

      await giveFeedback(database, recordingTracker(), input);
      await giveFeedback(database, recordingTracker(), input);

      expect(await feedbackRows(database)).toHaveLength(2);
    });
  });

  it("fails and records nothing when the tracker throws, logging the real error", async () => {
    const { database, account } = await setUp();

    const result = await giveFeedback(database, failingTracker, {
      account,
      text: "Something is off here.",
      page,
      commit,
    });

    expect(result).toEqual({ kind: "failed" });
    expect(await feedbackRows(database)).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Feedback"),
      expect.objectContaining({ message: "GitHub said 502" }),
    );
  });

  describe("the logging tracker", () => {
    it("writes the issue to the console and returns no URL", async () => {
      const { database, account } = await setUp();

      const result = await giveFeedback(database, loggingTracker, {
        account,
        text: "Something is off here.",
        page,
        commit,
      });

      expect(result).toStrictEqual({ kind: "sent" });
      const logged = vi.mocked(console.log).mock.calls.flat().join("\n");
      expect(logged).toContain("Feedback: Something is off here.");
      expect(logged).toContain("agent:explore, feedback");
      expect(logged).toContain(`Commit: ${commit}`);
      expect(await feedbackRows(database)).toHaveLength(1);
    });
  });
});
