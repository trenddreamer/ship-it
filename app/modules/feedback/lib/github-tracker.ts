import { z } from "zod";
import type { Tracker } from "./tracker";

export type GitHubTrackerOptions = {
  /** A token with Issues: write on the repo. Not Actions' built-in `GITHUB_TOKEN`. */
  token: string;
  /** The repo to open issues in, as `owner/name`, e.g. `trenddreamer/ship-it`. */
  repo: string;
  /** The `fetch` to call GitHub with. Defaults to the global one; tests pass a stub. */
  fetch?: typeof fetch;
};

/**
 * The part of GitHub's answer the tracker uses. An OK answer means the issue
 * is open, so one without a usable `html_url` is still sent, with no URL.
 */
const openedIssue = z.object({ html_url: z.string() });

/**
 * A Tracker that opens a real GitHub issue through the REST API, with its
 * labels applied in the same call, and returns the issue's URL. It throws,
 * with GitHub's status and answer, when GitHub doesn't open it.
 */
export function githubTracker({
  token,
  repo,
  fetch: fetchIssue = fetch,
}: GitHubTrackerOptions): Tracker {
  const url = `https://api.github.com/repos/${repo}/issues`;
  return {
    async openIssue({ title, body, labels }) {
      const response = await fetchIssue(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "feedback-tracker",
        },
        body: JSON.stringify({ title, body, labels }),
      });
      if (!response.ok) {
        throw new Error(
          `GitHub didn't open the issue in ${repo}: ${response.status} ${await response.text()}`,
        );
      }
      const opened = openedIssue.safeParse(await response.json().catch(() => undefined));
      return opened.success ? opened.data.html_url : undefined;
    },
  };
}
