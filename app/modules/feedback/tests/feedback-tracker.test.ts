import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedbackTracker, giveFeedback, type FeedbackTrackerSettings } from "../server";
import { addAccount, feedbackRows, freshDatabase } from "./fixtures";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const credentials = { appId: "123456", privateKey, installationId: "7890" };
const target = { repo: "someone/marketplace", repoLabel: "repo:marketplace" };

/** A stub GitHub that mints a token and opens an issue, keeping every call. */
function gitHub() {
  return vi.fn<typeof fetch>(async (url) =>
    Response.json(
      String(url).endsWith("/access_tokens")
        ? { token: "ghs_installation-token" }
        : { html_url: "https://github.com/someone/marketplace/issues/42" },
      { status: 201 },
    ),
  );
}

async function send(settings: FeedbackTrackerSettings) {
  const database = await freshDatabase();
  const account = await addAccount(database, "someone@example.test", "customer");
  const result = await giveFeedback(database, feedbackTracker(settings), {
    account,
    text: "Something is off here.",
    page: "/inbox",
    commit: "abc1234",
  });
  return { database, result };
}

describe("choosing where Feedback goes", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("files it as the Feedback App when all of the App's credentials are set", async () => {
    const fetch = gitHub();

    const { result } = await send({ ...credentials, ...target, fetch });

    expect(result).toStrictEqual({
      kind: "sent",
      issueUrl: "https://github.com/someone/marketplace/issues/42",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(console.log).not.toHaveBeenCalled();
  });

  it("accepts a private key written on one line with \\n for its line breaks", async () => {
    const fetch = gitHub();

    const { result } = await send({
      ...credentials,
      privateKey: privateKey.replaceAll("\n", "\\n"),
      ...target,
      fetch,
    });

    expect(result).toMatchObject({ kind: "sent", issueUrl: expect.any(String) });
  });

  it("only logs it, with the repo: label, never calling GitHub, when none is set", async () => {
    const fetch = gitHub();

    const { database, result } = await send({ ...target, fetch });

    expect(result).toStrictEqual({ kind: "sent" });
    expect(fetch).not.toHaveBeenCalled();
    expect(await feedbackRows(database)).toHaveLength(1);
    const logged = vi.mocked(console.log).mock.calls.flat().join("\n");
    expect(logged).toContain("Labels: agent:explore, feedback, repo:marketplace");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["appId", "FEEDBACK_APP_ID"],
    ["privateKey", "FEEDBACK_APP_PRIVATE_KEY"],
    ["installationId", "FEEDBACK_APP_INSTALLATION_ID"],
  ] as const)(
    "only logs it, and warns which setting is missing, when %s isn't set",
    async (missing, setting) => {
      const fetch = gitHub();

      const { result } = await send({ ...credentials, [missing]: "", ...target, fetch });

      expect(result).toStrictEqual({ kind: "sent" });
      expect(fetch).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        `Feedback is only logged: the Feedback App's credentials are incomplete. Missing: ${setting}.`,
      );
    },
  );

  it("names every missing setting in its warning", async () => {
    const fetch = gitHub();

    await send({ appId: credentials.appId, ...target, fetch });

    expect(fetch).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "Feedback is only logged: the Feedback App's credentials are incomplete. Missing: FEEDBACK_APP_PRIVATE_KEY, FEEDBACK_APP_INSTALLATION_ID.",
    );
  });
});
