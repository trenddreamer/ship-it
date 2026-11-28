import { describe, expect, it } from "vitest";
import { embedEvidence, evidenceUrl, publishEvidence, type Screenshot } from "./evidence.ts";

const REPO = "trenddreamer/marketplace";
const URL_A = evidenceUrl(REPO, "99-1", "a.png");
const URL_B = evidenceUrl(REPO, "99-1", "b.png");

describe("evidenceUrl", () => {
  it("points at the file's raw form on the evidence branch, in the run's folder", () => {
    expect(evidenceUrl(REPO, "99-1", "after.png")).toBe(
      "https://github.com/trenddreamer/marketplace/raw/factory-evidence/99-1/after.png",
    );
  });

  it("encodes a name that isn't safe in a URL", () => {
    expect(evidenceUrl(REPO, "99-1", "a b#1.png")).toBe(
      "https://github.com/trenddreamer/marketplace/raw/factory-evidence/99-1/a%20b%231.png",
    );
  });

  it("uses the given server, for GitHub Enterprise Cloud", () => {
    expect(evidenceUrl(REPO, "1-1", "a.png", "https://acme.ghe.com")).toBe(
      "https://acme.ghe.com/trenddreamer/marketplace/raw/factory-evidence/1-1/a.png",
    );
  });
});

describe("embedEvidence", () => {
  const urls = { "a.png": URL_A, "b.png": URL_B };

  it("points an image at its published URL, keeping its alt text", () => {
    expect(embedEvidence("Before:\n\n![before](/tmp/evidence/a.png)\n", urls, ["a.png"])).toBe(
      `Before:\n\n![before](${URL_A})\n`,
    );
  });

  it("keeps a title, and drops angle brackets around the path", () => {
    expect(embedEvidence('![x](</tmp/evidence/a.png> "The page")', urls, [])).toBe(
      `![x](${URL_A} "The page")`,
    );
  });

  it("rewrites a plain link too", () => {
    expect(embedEvidence("[full size](/tmp/evidence/a.png)", urls, [])).toBe(
      `[full size](${URL_A})`,
    );
  });

  it("rewrites every reference to the same screenshot, and appends nothing", () => {
    expect(
      embedEvidence("![a](/tmp/evidence/a.png) and ![again](/tmp/evidence/a.png)", urls, ["a.png"]),
    ).toBe(`![a](${URL_A}) and ![again](${URL_A})`);
  });

  it("rewrites an HTML image's src, in either quote", () => {
    expect(
      embedEvidence(
        `<img src="/tmp/evidence/a.png" width="400"> <img src='/tmp/evidence/b.png'>`,
        urls,
        ["a.png", "b.png"],
      ),
    ).toBe(`<img src="${URL_A}" width="400"> <img src='${URL_B}'>`);
  });

  it("appends a screenshot of its own that the body never references", () => {
    expect(embedEvidence("Done.\n\n", urls, ["a.png", "b.png"])).toBe(
      `Done.\n\n![a.png](${URL_A})\n\n![b.png](${URL_B})\n`,
    );
  });

  it("doesn't append another body's screenshots, but still rewrites a reference to one", () => {
    expect(embedEvidence("See ![b](/tmp/evidence/b.png)", urls, ["a.png"])).toBe(
      `See ![b](${URL_B})\n\n![a.png](${URL_A})\n`,
    );
  });

  it("treats a path mentioned only as text as unreferenced, and appends the image", () => {
    expect(embedEvidence("It is `/tmp/evidence/a.png`.", urls, ["a.png"])).toBe(
      `It is \`/tmp/evidence/a.png\`.\n\n![a.png](${URL_A})\n`,
    );
  });

  it("says so where a referenced screenshot has no URL", () => {
    expect(embedEvidence("![gone](/tmp/evidence/c.png) end", urls, [])).toBe(
      "_(Screenshot `c.png` could not be published. See the run's logs.)_ end",
    );
  });

  it("leaves an HTML image with no URL as it is", () => {
    expect(embedEvidence(`<img src="/tmp/evidence/c.png">`, urls, [])).toBe(
      `<img src="/tmp/evidence/c.png">`,
    );
  });

  it("appends that note for an unreferenced screenshot of its own that didn't publish", () => {
    expect(embedEvidence("Done.", {}, ["c.png"])).toBe(
      "Done.\n\n_(Screenshot `c.png` could not be published. See the run's logs.)_\n",
    );
  });

  it("leaves a body with no screenshots exactly as it is", () => {
    const body = "No UI change.\n\n![logo](https://example.com/logo.png)\n";
    expect(embedEvidence(body, urls, [])).toBe(body);
  });

  it("leaves an image elsewhere in /tmp alone", () => {
    expect(embedEvidence("![x](/tmp/other/a.png)", urls, [])).toBe("![x](/tmp/other/a.png)");
  });
});

// A stand-in for GitHub's Git database API. It records every call, and answers
// from `routes`: `"METHOD path"` → a status and a body, or a queue of them.
type Answer = { status: number; body?: unknown };
function fakeGitHub(routes: Record<string, Answer | Answer[]>) {
  const calls: {
    method: string;
    path: string;
    body: unknown;
    headers: Headers;
    auth: string | null;
  }[] = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const path = url.replace(`https://api.github.com/repos/${REPO}/`, "");
    const method = init?.method ?? "GET";
    calls.push({
      method,
      path,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: new Headers(init?.headers),
      auth: new Headers(init?.headers).get("Authorization"),
    });
    const route = routes[`${method} ${path}`];
    const answer = Array.isArray(route) ? route.shift() : route;
    if (!answer) throw new Error(`Unexpected call: ${method} ${url}`);
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const screenshots: Screenshot[] = [
  { name: "a.png", bytes: new Uint8Array([1, 2, 3]) },
  { name: "b.png", bytes: new Uint8Array([4]) },
];
const options = { repo: REPO, folder: "99-1", token: "t0ken", message: "Screenshots from run 99" };
// A fresh queue each time: the fake answers by taking from it.
const blobs = () => ({
  "POST git/blobs": [
    { status: 201, body: { sha: "blob-a" } },
    { status: 201, body: { sha: "blob-b" } },
  ],
});
const entries = [
  { path: "99-1/a.png", mode: "100644", type: "blob", sha: "blob-a" },
  { path: "99-1/b.png", mode: "100644", type: "blob", sha: "blob-b" },
];

describe("publishEvidence", () => {
  it("does nothing, and calls nothing, with no screenshots", async () => {
    const github = fakeGitHub({});
    expect(await publishEvidence({ ...options, screenshots: [], fetch: github.fetch })).toEqual({});
    expect(github.calls).toEqual([]);
  });

  it("starts the branch with one commit of its own when it isn't there yet", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 404 },
      "POST git/trees": { status: 201, body: { sha: "tree-1" } },
      "POST git/commits": { status: 201, body: { sha: "commit-1" } },
      "POST git/refs": { status: 201 },
    });

    const urls = await publishEvidence({ ...options, screenshots, fetch: github.fetch });

    expect(urls).toEqual({ "a.png": URL_A, "b.png": URL_B });
    expect(github.calls.map((call) => [call.method, call.path, call.body])).toEqual([
      ["POST", "git/blobs", { content: "AQID", encoding: "base64" }],
      ["POST", "git/blobs", { content: "BA==", encoding: "base64" }],
      ["GET", "git/ref/heads/factory-evidence", undefined],
      ["POST", "git/trees", { tree: entries }],
      ["POST", "git/commits", { message: "Screenshots from run 99", tree: "tree-1", parents: [] }],
      ["POST", "git/refs", { ref: "refs/heads/factory-evidence", sha: "commit-1" }],
    ]);
  });

  it("adds a commit on top of the branch's tip, keeping what's there, and never forces", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 200, body: { object: { sha: "tip" } } },
      "GET git/commits/tip": { status: 200, body: { tree: { sha: "tip-tree" } } },
      "POST git/trees": { status: 201, body: { sha: "tree-2" } },
      "POST git/commits": { status: 201, body: { sha: "commit-2" } },
      "PATCH git/refs/heads/factory-evidence": { status: 200 },
    });

    await publishEvidence({ ...options, screenshots, fetch: github.fetch });

    expect(github.calls.slice(3).map((call) => [call.method, call.path, call.body])).toEqual([
      ["GET", "git/commits/tip", undefined],
      ["POST", "git/trees", { base_tree: "tip-tree", tree: entries }],
      ["POST", "git/commits", { message: options.message, tree: "tree-2", parents: ["tip"] }],
      ["PATCH", "git/refs/heads/factory-evidence", { sha: "commit-2", force: false }],
    ]);
  });

  it("authenticates every call with the token", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 404 },
      "POST git/trees": { status: 201, body: { sha: "tree-1" } },
      "POST git/commits": { status: 201, body: { sha: "commit-1" } },
      "POST git/refs": { status: 201 },
    });
    await publishEvidence({ ...options, screenshots, fetch: github.fetch });
    expect(new Set(github.calls.map((call) => call.auth))).toEqual(new Set(["Bearer t0ken"]));
  });

  it("builds again on the new tip when another run moved the branch first", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": [
        { status: 200, body: { object: { sha: "old" } } },
        { status: 200, body: { object: { sha: "new" } } },
      ],
      "GET git/commits/old": { status: 200, body: { tree: { sha: "old-tree" } } },
      "GET git/commits/new": { status: 200, body: { tree: { sha: "new-tree" } } },
      "POST git/trees": [
        { status: 201, body: { sha: "tree-old" } },
        { status: 201, body: { sha: "tree-new" } },
      ],
      "POST git/commits": [
        { status: 201, body: { sha: "commit-old" } },
        { status: 201, body: { sha: "commit-new" } },
      ],
      "PATCH git/refs/heads/factory-evidence": [{ status: 422 }, { status: 200 }],
    });

    expect(await publishEvidence({ ...options, screenshots, fetch: github.fetch })).toEqual({
      "a.png": URL_A,
      "b.png": URL_B,
    });
    const writes = github.calls.filter((call) => call.method !== "GET");
    // The blobs went up once; the tree and commit were built again on "new".
    expect(writes.filter((call) => call.path === "git/blobs")).toHaveLength(2);
    expect(writes.slice(-3).map((call) => call.body)).toEqual([
      { base_tree: "new-tree", tree: entries },
      { message: options.message, tree: "tree-new", parents: ["new"] },
      { sha: "commit-new", force: false },
    ]);
  });

  it("builds on the branch another run just created, when creating it is refused", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": [
        { status: 404 },
        { status: 200, body: { object: { sha: "theirs" } } },
      ],
      "GET git/commits/theirs": { status: 200, body: { tree: { sha: "their-tree" } } },
      "POST git/trees": { status: 201, body: { sha: "tree" } },
      "POST git/commits": { status: 201, body: { sha: "commit" } },
      "POST git/refs": { status: 422 },
      "PATCH git/refs/heads/factory-evidence": { status: 200 },
    });

    await publishEvidence({ ...options, screenshots, fetch: github.fetch });
    expect(github.calls.at(-1)).toMatchObject({ method: "PATCH", body: { sha: "commit" } });
  });

  it("gives up after its attempts, with the reason", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 200, body: { object: { sha: "tip" } } },
      "GET git/commits/tip": { status: 200, body: { tree: { sha: "tip-tree" } } },
      "POST git/trees": { status: 201, body: { sha: "tree" } },
      "POST git/commits": { status: 201, body: { sha: "commit" } },
      "PATCH git/refs/heads/factory-evidence": { status: 422 },
    });
    // A fixed answer, not a queue, so every attempt is refused.
    await expect(
      publishEvidence({ ...options, screenshots, fetch: github.fetch, attempts: 2 }),
    ).rejects.toThrow("Moving the branch: GitHub answered 422");
    expect(github.calls.filter((call) => call.method === "PATCH")).toHaveLength(2);
  });

  it("asks for GitHub's JSON at a fixed API version, and sends a body only with JSON", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 404 },
      "POST git/trees": { status: 201, body: { sha: "tree-1" } },
      "POST git/commits": { status: 201, body: { sha: "commit-1" } },
      "POST git/refs": { status: 201 },
    });
    await publishEvidence({ ...options, screenshots, fetch: github.fetch });

    for (const call of github.calls) {
      expect(call.headers.get("Accept")).toBe("application/vnd.github+json");
      expect(call.headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
    }
    const read = github.calls.find((call) => call.method === "GET");
    expect(read?.body).toBeUndefined();
    expect(read?.headers.has("Content-Type")).toBe(false);
    const write = github.calls.find((call) => call.method === "POST");
    expect(write?.headers.get("Content-Type")).toBe("application/json");
  });

  it("doesn't retry a refusal to move the branch that isn't a race", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 200, body: { object: { sha: "tip" } } },
      "GET git/commits/tip": { status: 200, body: { tree: { sha: "tip-tree" } } },
      "POST git/trees": { status: 201, body: { sha: "tree" } },
      "POST git/commits": { status: 201, body: { sha: "commit" } },
      "PATCH git/refs/heads/factory-evidence": { status: 403 },
    });
    await expect(publishEvidence({ ...options, screenshots, fetch: github.fetch })).rejects.toThrow(
      "Moving the branch: GitHub answered 403",
    );
    expect(github.calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });

  it.each([
    ["GET git/commits/tip", "Reading the branch"],
    ["POST git/trees", "Writing the tree"],
    ["POST git/commits", "Writing the commit"],
  ])("names the step when %s is refused", async (route, step) => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 200, body: { object: { sha: "tip" } } },
      "GET git/commits/tip": { status: 200, body: { tree: { sha: "tip-tree" } } },
      "POST git/trees": { status: 201, body: { sha: "tree" } },
      "POST git/commits": { status: 201, body: { sha: "commit" } },
      [route]: { status: 500 },
    });
    await expect(publishEvidence({ ...options, screenshots, fetch: github.fetch })).rejects.toThrow(
      `${step}: GitHub answered 500`,
    );
  });

  it("names the step when creating the branch is refused", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 404 },
      "POST git/trees": { status: 201, body: { sha: "tree" } },
      "POST git/commits": { status: 201, body: { sha: "commit" } },
      "POST git/refs": { status: 403 },
    });
    await expect(publishEvidence({ ...options, screenshots, fetch: github.fetch })).rejects.toThrow(
      "Creating the branch: GitHub answered 403",
    );
  });

  it("stops at once on any other refusal, naming the step", async () => {
    const github = fakeGitHub({ "POST git/blobs": { status: 403 } });
    await expect(publishEvidence({ ...options, screenshots, fetch: github.fetch })).rejects.toThrow(
      "Uploading a.png: GitHub answered 403",
    );
    expect(github.calls).toHaveLength(1);
  });

  it("stops when the branch can't be read for a reason other than its absence", async () => {
    const github = fakeGitHub({
      ...blobs(),
      "GET git/ref/heads/factory-evidence": { status: 500 },
    });
    await expect(publishEvidence({ ...options, screenshots, fetch: github.fetch })).rejects.toThrow(
      "Finding the branch: GitHub answered 500",
    );
  });
});
