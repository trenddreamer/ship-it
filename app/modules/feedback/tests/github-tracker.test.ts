import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { giveFeedback, githubTracker } from "../server";
import { addAccount, feedbackRows, freshDatabase } from "./fixtures";

const token = "test-token-123";
const repo = "someone/marketplace";
const issueUrl = "https://github.com/someone/marketplace/issues/42";

/** A stub `fetch` that answers every call with `status` and `body`, and keeps each call. */
function answer(status: number, body: unknown) {
  return vi.fn<typeof fetch>(
    async () =>
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

async function send(fetch: typeof globalThis.fetch) {
  const database = await freshDatabase();
  const account = await addAccount(database, "someone@example.test", "customer");
  const result = await giveFeedback(database, githubTracker({ token, repo, fetch }), {
    account,
    text: "The subscribe button does nothing.\nI clicked it twice.",
    page: "/products/12/subscribe",
    commit: "d9233d3",
  });
  return { database, account, result };
}

/** The one call made to `fetch`, as the URL and the request options. */
function onlyCall(fetch: ReturnType<typeof answer>) {
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0]!;
  return { url, init: init!, headers: new Headers(init!.headers) };
}

describe("the GitHub tracker", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("POSTs to the repo's issues in GitHub's REST API", async () => {
    const fetch = answer(201, { html_url: issueUrl });

    await send(fetch);

    const { url, init } = onlyCall(fetch);
    expect(url).toBe("https://api.github.com/repos/someone/marketplace/issues");
    expect(init.method).toBe("POST");
  });

  it("authenticates with the token, asks for GitHub's JSON and names a generic client", async () => {
    const fetch = answer(201, { html_url: issueUrl });

    await send(fetch);

    const { headers } = onlyCall(fetch);
    expect(headers.get("Authorization")).toBe(`Bearer ${token}`);
    expect(headers.get("Accept")).toBe("application/vnd.github+json");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("User-Agent")).toBe("feedback-tracker");
  });

  it("sends the title, body and both labels as JSON, in the one call", async () => {
    const fetch = answer(201, { html_url: issueUrl });

    await send(fetch);

    const { init } = onlyCall(fetch);
    const sent = JSON.parse(init.body as string);
    expect(sent).toStrictEqual({
      title: "Feedback: The subscribe button does nothing.",
      body: expect.stringMatching(/^The subscribe button does nothing\.\nI clicked it twice\.\n/),
      labels: ["agent:explore", "feedback"],
    });
    expect(sent.body).toContain("Page: /products/12/subscribe");
  });

  it("gives back the issue's html_url as the URL Feedback was sent to, and records the row", async () => {
    const fetch = answer(201, { html_url: issueUrl, id: 1, number: 42 });

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
    const fetch = answer(201, body);

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
      const fetch = answer(status, `{"message":"${text}"}`);

      const { database, result } = await send(fetch);

      expect(result).toEqual({ kind: "failed" });
      expect(await feedbackRows(database)).toEqual([]);
      const [, error] = vi.mocked(console.error).mock.calls[0]!;
      expect((error as Error).message).toBe(
        `GitHub didn't open the issue in ${repo}: ${status} {"message":"${text}"}`,
      );
    },
  );

  it("fails and records nothing when the network fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError("fetch failed");
    });

    const { database, result } = await send(fetch);

    expect(result).toEqual({ kind: "failed" });
    expect(await feedbackRows(database)).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: "fetch failed" }),
    );
  });
});
