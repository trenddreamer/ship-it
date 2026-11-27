import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { feedbackTracker, giveFeedback } from "../server";
import { addAccount, feedbackRows, freshDatabase } from "./fixtures";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const app = { appId: "123456", privateKey, installationId: "7890" };
const repo = "someone/marketplace";
const repoLabel = "repo:marketplace";
const token = "ghs_installation-token";
const issueUrl = "https://github.com/someone/marketplace/issues/42";
const mintUrl = "https://api.github.com/app/installations/7890/access_tokens";
const issuesUrl = "https://api.github.com/repos/someone/marketplace/issues";

type Answer = { status: number; body: unknown };
const minted: Answer = { status: 201, body: { token, expires_at: "2026-11-27T13:00:00Z" } };
const opened: Answer = { status: 201, body: { html_url: issueUrl } };

function response({ status, body }: Answer) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * A stub GitHub: a `fetch` that answers the token endpoint with `mint` and
 * the issues endpoint with `open`, and keeps every call.
 */
function gitHub({ mint = minted, open = opened }: { mint?: Answer; open?: Answer } = {}) {
  return vi.fn<typeof fetch>(async (url) => {
    if (url === mintUrl) return response(mint);
    if (url === issuesUrl) return response(open);
    return response({ status: 404, body: { message: "Not Found" } });
  });
}

async function send(fetch: typeof globalThis.fetch) {
  const database = await freshDatabase();
  const account = await addAccount(database, "someone@example.test", "customer");
  const result = await giveFeedback(database, feedbackTracker({ ...app, repo, repoLabel, fetch }), {
    account,
    text: "The subscribe button does nothing.\nI clicked it twice.",
    page: "/products/12/subscribe",
    commit: "d9233d3",
  });
  return { database, account, result };
}

/** Every call made to `fetch`, as the URL, the request options and their headers. */
function calls(fetch: ReturnType<typeof gitHub>) {
  return fetch.mock.calls.map(([url, init]) => ({
    url,
    init: init!,
    headers: new Headers(init!.headers),
  }));
}

/** The call that opened the issue: the second and last. */
function issueCall(fetch: ReturnType<typeof gitHub>) {
  const all = calls(fetch);
  expect(all.map(({ url }) => url)).toEqual([mintUrl, issuesUrl]);
  return all[1]!;
}

/** The call that minted the token: the first. */
function mintCall(fetch: ReturnType<typeof gitHub>) {
  const all = calls(fetch);
  expect(all[0]!.url).toBe(mintUrl);
  return all[0]!;
}

function decode(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString());
}

/** A JWT's header and payload, once its RS256 signature checks out with the App's public key. */
function verifiedJwt(jwt: string) {
  const [header, payload, signature, ...rest] = jwt.split(".");
  expect(rest).toEqual([]);
  const signed = verify(
    "sha256",
    Buffer.from(`${header}.${payload}`),
    createPublicKey(publicKey),
    Buffer.from(signature!, "base64url"),
  );
  expect(signed).toBe(true);
  return { header: decode(header!), payload: decode(payload!) };
}

describe("the GitHub tracker", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("mints an installation token as the App, then opens the issue with it", async () => {
    const fetch = gitHub();

    await send(fetch);

    const mint = mintCall(fetch);
    expect(mint.init.method).toBe("POST");
    const { header, payload } = verifiedJwt(
      mint.headers.get("Authorization")!.replace(/^Bearer /, ""),
    );
    expect(header).toStrictEqual({ alg: "RS256", typ: "JWT" });
    expect(payload.iss).toBe("123456");
    const issue = issueCall(fetch);
    expect(issue.init.method).toBe("POST");
    expect(issue.headers.get("Authorization")).toBe(`Bearer ${token}`);
  });

  it("signs a JWT issued a minute ago, for GitHub's clock, that expires within GitHub's 10 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-27T12:00:00Z") });
    const fetch = gitHub();

    await send(fetch);

    const { headers } = mintCall(fetch);
    const { payload } = verifiedJwt(headers.get("Authorization")!.replace(/^Bearer /, ""));
    const noon = Date.parse("2026-11-27T12:00:00Z") / 1000;
    expect(payload).toStrictEqual({ iat: noon - 60, exp: noon + 540, iss: "123456" });
  });

  it("asks for GitHub's JSON and names a generic client when minting", async () => {
    const fetch = gitHub();

    await send(fetch);

    const { headers } = mintCall(fetch);
    expect(headers.get("Accept")).toBe("application/vnd.github+json");
    expect(headers.get("User-Agent")).toBe("feedback-tracker");
  });

  it("mints a fresh token for each piece of Feedback", async () => {
    const fetch = gitHub();
    const database = await freshDatabase();
    const account = await addAccount(database, "someone@example.test", "customer");
    const tracker = feedbackTracker({ ...app, repo, repoLabel, fetch });
    const input = { account, text: "Something is off here.", page: "/inbox", commit: "abc1234" };

    await giveFeedback(database, tracker, input);
    await giveFeedback(database, tracker, input);

    expect(calls(fetch).map(({ url }) => url)).toEqual([mintUrl, issuesUrl, mintUrl, issuesUrl]);
  });

  it("asks for GitHub's JSON and names a generic client when opening the issue", async () => {
    const fetch = gitHub();

    await send(fetch);

    const { headers } = issueCall(fetch);
    expect(headers.get("Accept")).toBe("application/vnd.github+json");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("User-Agent")).toBe("feedback-tracker");
  });

  it("sends the title, body and exactly `agent:explore`, `feedback` and the repo: label as JSON, in the one call", async () => {
    const fetch = gitHub();

    await send(fetch);

    const { init } = issueCall(fetch);
    const sent = JSON.parse(init.body as string);
    expect(sent).toStrictEqual({
      title: "Feedback: The subscribe button does nothing.",
      body: expect.stringMatching(/^The subscribe button does nothing\.\nI clicked it twice\.\n/),
      labels: ["agent:explore", "feedback", "repo:marketplace"],
    });
    expect(sent.body).toContain("Page: /products/12/subscribe");
  });

  it("gives back the issue's html_url as the URL Feedback was sent to, and records the row", async () => {
    const fetch = gitHub({
      open: { status: 201, body: { html_url: issueUrl, id: 1, number: 42 } },
    });

    const { database, account, result } = await send(fetch);

    expect(result).toStrictEqual({ kind: "sent", issueUrl });
    expect(await feedbackRows(database)).toEqual([
      expect.objectContaining({ accountId: account.id }),
    ]);
  });

  it.each([
    ["no html_url", { id: 1, number: 42 }],
    ["an html_url that isn't a string", { html_url: 42 }],
    ["a body that isn't JSON", "Created"],
  ])("counts an OK answer with %s as sent, with no URL", async (_, body) => {
    const fetch = gitHub({ open: { status: 201, body } });

    const { database, account, result } = await send(fetch);

    expect(result).toStrictEqual({ kind: "sent" });
    expect(await feedbackRows(database)).toEqual([
      expect.objectContaining({ accountId: account.id }),
    ]);
  });

  it.each([
    [404, "Not Found"],
    [422, "Validation Failed"],
    [502, "Bad Gateway"],
  ])(
    "fails on a %i, records nothing, and logs the status and GitHub's answer",
    async (status, text) => {
      const fetch = gitHub({ open: { status, body: `{"message":"${text}"}` } });

      const { database, result } = await send(fetch);

      expect(result).toEqual({ kind: "failed" });
      expect(await feedbackRows(database)).toEqual([]);
      const [, error] = vi.mocked(console.error).mock.calls[0]!;
      expect((error as Error).message).toBe(
        `GitHub didn't open the issue in ${repo}: ${status} {"message":"${text}"}`,
      );
    },
  );

  it("fails, records nothing, and logs the repo and the cause when the network fails", async () => {
    const cause = new TypeError("fetch failed");
    const stub = gitHub();
    const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
      if (url === issuesUrl) throw cause;
      return stub(url, init);
    });

    const { database, result } = await send(fetch);

    expect(result).toEqual({ kind: "failed" });
    expect(await feedbackRows(database)).toEqual([]);
    const [, error] = vi.mocked(console.error).mock.calls[0]!;
    expect((error as Error).message).toBe(
      `GitHub couldn't be reached to open the issue in ${repo}: TypeError: fetch failed`,
    );
    expect((error as Error).cause).toBe(cause);
  });

  describe("when the token can't be minted", () => {
    it.each([
      [401, "Bad credentials"],
      [404, "Not Found"],
      [500, "Server Error"],
    ])(
      "fails on a %i, opens no issue, records nothing, and logs the status and GitHub's answer",
      async (status, text) => {
        const fetch = gitHub({ mint: { status, body: `{"message":"${text}"}` } });

        const { database, result } = await send(fetch);

        expect(result).toEqual({ kind: "failed" });
        expect(calls(fetch).map(({ url }) => url)).toEqual([mintUrl]);
        expect(await feedbackRows(database)).toEqual([]);
        const [, error] = vi.mocked(console.error).mock.calls[0]!;
        expect((error as Error).message).toBe(
          `GitHub didn't mint a Feedback App token: ${status} {"message":"${text}"}`,
        );
      },
    );

    it.each([
      ["no token", { expires_at: "2026-11-27T13:00:00Z" }],
      ["a token that isn't a string", { token: 42 }],
      ["a body that isn't JSON", "Created"],
    ])("fails on an OK answer with %s, and opens no issue", async (_, body) => {
      const fetch = gitHub({ mint: { status: 201, body } });

      const { database, result } = await send(fetch);

      expect(result).toEqual({ kind: "failed" });
      expect(calls(fetch).map(({ url }) => url)).toEqual([mintUrl]);
      expect(await feedbackRows(database)).toEqual([]);
      const [, error] = vi.mocked(console.error).mock.calls[0]!;
      expect((error as Error).message).toBe("GitHub's answer had no Feedback App token in it");
    });

    it("fails, opens no issue, and logs the cause when the network fails", async () => {
      const cause = new TypeError("fetch failed");
      const fetch = vi.fn<typeof globalThis.fetch>(async () => {
        throw cause;
      });

      const { database, result } = await send(fetch);

      expect(result).toEqual({ kind: "failed" });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(await feedbackRows(database)).toEqual([]);
      const [, error] = vi.mocked(console.error).mock.calls[0]!;
      expect((error as Error).message).toBe(
        "GitHub couldn't be reached to mint a Feedback App token: TypeError: fetch failed",
      );
      expect((error as Error).cause).toBe(cause);
    });
  });
});
