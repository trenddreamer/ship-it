// The agents' screenshots, published so a comment, pull request or Ticket can
// show them inline (ADR-0004, "Screenshots").
//
// GitHub's own attachments (`gh --attach`) refuse every GitHub App
// installation token, whatever its permissions (cli/cli#14309). So the Factory
// commits the screenshots to a branch of their own in the Enrolled repo,
// EVIDENCE_BRANCH, which is never merged, and links to each by its `raw/` URL.
// GitHub serves those to anyone signed in who can read the repo, and renders
// them inline, private repo or not.

/** The branch the screenshots live on, in each Enrolled repo. */
export const EVIDENCE_BRANCH = "factory-evidence";

/** Where an agent saves its screenshots, and how it references them. */
export const EVIDENCE_DIR = "/tmp/evidence";

/** Where a published screenshot shows: `<server>/<repo>/raw/<branch>/<folder>/<name>`. */
export function evidenceUrl(
  repo: string,
  folder: string,
  name: string,
  server = "https://github.com",
): string {
  return `${server}/${repo}/raw/${EVIDENCE_BRANCH}/${folder}/${encodeURIComponent(name)}`;
}

function missingNote(name: string): string {
  return `_(Screenshot \`${name}\` could not be published. See the run's logs.)_`;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dir = escapeRegExp(EVIDENCE_DIR);

// A Markdown image or link whose destination is a screenshot's path, with an
// optional <...> around it and an optional title: `![alt](/tmp/evidence/a.png "t")`.
const markdownReference = new RegExp(
  `(!?)\\[([^\\]]*)\\]\\(\\s*<?${dir}/([^\\s)>]+)>?(\\s+"[^"]*")?\\s*\\)`,
  "g",
);
// An HTML image's src: `<img src="/tmp/evidence/a.png">`.
const htmlSource = new RegExp(`src=(["'])${dir}/([^"']+)\\1`, "g");

/**
 * Points a body's screenshots at their published URLs, as `gh --attach` did.
 *
 * - Every Markdown image or link, and every `<img src>`, that points at a
 *   screenshot's path gets its URL. One that has no URL (it failed to
 *   publish, or was never saved) becomes a note saying so.
 * - `own` lists this body's screenshots. Any of them the body doesn't
 *   reference is appended, as an image or as that note, so none is lost.
 *   A path mentioned only as text, e.g. in backticks, isn't a reference.
 */
export function embedEvidence(
  markdown: string,
  urls: Readonly<Record<string, string>>,
  own: readonly string[],
): string {
  const referenced = new Set<string>();
  let body = markdown.replace(
    markdownReference,
    (_match, bang: string, text: string, name: string, title: string | undefined) => {
      referenced.add(name);
      const url = urls[name];
      return url ? `${bang}[${text}](${url}${title ?? ""})` : missingNote(name);
    },
  );
  body = body.replace(htmlSource, (match, quote: string, name: string) => {
    referenced.add(name);
    const url = urls[name];
    return url ? `src=${quote}${url}${quote}` : match;
  });

  const unreferenced = own.filter((name) => !referenced.has(name));
  if (unreferenced.length === 0) return body;
  const appended = unreferenced.map((name) => {
    const url = urls[name];
    return url ? `![${name}](${url})` : missingNote(name);
  });
  return `${body.trimEnd()}\n\n${appended.join("\n\n")}\n`;
}

/** A screenshot to publish: its file name, and its bytes. */
export interface Screenshot {
  name: string;
  bytes: Uint8Array;
}

export interface PublishOptions {
  /** The Enrolled repo, `owner/name`, that holds EVIDENCE_BRANCH. */
  repo: string;
  /** The folder on the branch, unique to the run: `<run id>-<attempt>`. */
  folder: string;
  screenshots: readonly Screenshot[];
  /** A token for `repo` with Contents: write. */
  token: string;
  /** The commit's message. */
  message: string;
  fetch: typeof globalThis.fetch;
  api?: string;
  server?: string;
  /** How many times to try moving the branch when another run moved it first. */
  attempts?: number;
}

// No parameter properties: Node strips types, and can't strip those.
class GitHubError extends Error {
  readonly status: number;
  constructor(status: number, what: string) {
    super(`${what}: GitHub answered ${status}`);
    this.status = status;
  }
}

/**
 * Commits the screenshots to `<folder>/<name>` on EVIDENCE_BRANCH in one
 * commit, creating the branch if it isn't there, and returns each one's URL.
 *
 * Through the Git database API, so nothing is cloned: the branch only grows.
 * If another run moves the branch first, it builds the commit again on the
 * new tip, up to `attempts` times, and never forces.
 */
export async function publishEvidence(options: PublishOptions): Promise<Record<string, string>> {
  const { repo, folder, screenshots, token, message, fetch } = options;
  const api = options.api ?? "https://api.github.com";
  const attempts = options.attempts ?? 5;
  if (screenshots.length === 0) return {};

  async function call<T>(method: string, path: string, what: string, body?: unknown) {
    const response = await fetch(`${api}/repos/${repo}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new GitHubError(response.status, what);
    return (await response.json()) as T;
  }

  async function branchTip(): Promise<string | undefined> {
    try {
      const ref = await call<{ object: { sha: string } }>(
        "GET",
        `git/ref/heads/${EVIDENCE_BRANCH}`,
        "Finding the branch",
      );
      return ref.object.sha;
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return undefined;
      throw error;
    }
  }

  const blobs: { path: string; sha: string }[] = [];
  for (const { name, bytes } of screenshots) {
    const blob = await call<{ sha: string }>("POST", "git/blobs", `Uploading ${name}`, {
      content: Buffer.from(bytes).toString("base64"),
      encoding: "base64",
    });
    blobs.push({ path: `${folder}/${name}`, sha: blob.sha });
  }
  const entries = blobs.map(({ path, sha }) => ({ path, mode: "100644", type: "blob", sha }));

  for (let attempt = 1; ; attempt++) {
    const head = await branchTip();
    const baseTree = head
      ? (await call<{ tree: { sha: string } }>("GET", `git/commits/${head}`, "Reading the branch"))
          .tree.sha
      : undefined;
    const tree = await call<{ sha: string }>("POST", "git/trees", "Writing the tree", {
      ...(baseTree ? { base_tree: baseTree } : {}),
      tree: entries,
    });
    const commit = await call<{ sha: string }>("POST", "git/commits", "Writing the commit", {
      message,
      tree: tree.sha,
      parents: head ? [head] : [],
    });
    try {
      if (head) {
        await call("PATCH", `git/refs/heads/${EVIDENCE_BRANCH}`, "Moving the branch", {
          sha: commit.sha,
          force: false,
        });
      } else {
        await call("POST", "git/refs", "Creating the branch", {
          ref: `refs/heads/${EVIDENCE_BRANCH}`,
          sha: commit.sha,
        });
      }
      break;
    } catch (error) {
      // 422: another run moved or created the branch first. Build on its tip.
      if (!(error instanceof GitHubError && error.status === 422) || attempt >= attempts) {
        throw error;
      }
    }
  }

  return Object.fromEntries(
    screenshots.map(({ name }) => [name, evidenceUrl(repo, folder, name, options.server)]),
  );
}
