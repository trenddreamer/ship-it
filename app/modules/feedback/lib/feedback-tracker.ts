import { githubTracker } from "./github-tracker";
import { loggingTracker, type Tracker } from "./tracker";

/**
 * Where Feedback goes, from configuration. The Feedback App's credentials
 * are optional: an empty one counts as missing.
 */
export type FeedbackTrackerSettings = {
  /** The Feedback App's ID (`FEEDBACK_APP_ID`). */
  appId?: string;
  /**
   * The Feedback App's private key in PEM (`FEEDBACK_APP_PRIVATE_KEY`). It may
   * be on one line, with `\n` for its line breaks.
   */
  privateKey?: string;
  /** The ID of the App's installation on `repo` (`FEEDBACK_APP_INSTALLATION_ID`). */
  installationId?: string;
  /** The repo Feedback is filed in, as `owner/name`. */
  repo: string;
  /** The `repo:` label every Feedback issue carries, e.g. `repo:marketplace`. */
  repoLabel: string;
  /** The `fetch` to call GitHub with. Defaults to the global one; tests pass a stub. */
  fetch?: typeof fetch;
};

const settingNames = {
  appId: "FEEDBACK_APP_ID",
  privateKey: "FEEDBACK_APP_PRIVATE_KEY",
  installationId: "FEEDBACK_APP_INSTALLATION_ID",
} as const;

/**
 * The Tracker for these settings. With all of the Feedback App's credentials
 * it is the GitHub tracker, filing Feedback as the App. With none it only
 * logs Feedback, so local development, the checks and the journey never file
 * real Tickets. With some but not all, it only logs too, and warns which
 * settings are missing.
 */
export function feedbackTracker({
  appId,
  privateKey,
  installationId,
  repo,
  repoLabel,
  fetch,
}: FeedbackTrackerSettings): Tracker {
  if (appId && privateKey && installationId) {
    return githubTracker({
      appId,
      privateKey: privateKey.replaceAll("\\n", "\n"),
      installationId,
      repo,
      repoLabel,
      fetch,
    });
  }
  const credentials = { appId, privateKey, installationId };
  const missing = Object.entries(settingNames)
    .filter(([key]) => !credentials[key as keyof typeof credentials])
    .map(([, name]) => name);
  if (missing.length < 3) {
    console.warn(
      `Feedback is only logged: the Feedback App's credentials are incomplete. Missing: ${missing.join(", ")}.`,
    );
  }
  return {
    openIssue: (issue) =>
      loggingTracker.openIssue({ ...issue, labels: [...issue.labels, repoLabel] }),
  };
}
