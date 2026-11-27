import type { FeedbackApp } from "./app-token";
import { githubTracker } from "./github-tracker";
import { loggingTracker, type Tracker } from "./tracker";

/**
 * Where Feedback goes, from configuration. The Feedback App's credentials
 * (`FEEDBACK_APP_ID`, `FEEDBACK_APP_PRIVATE_KEY`, `FEEDBACK_APP_INSTALLATION_ID`)
 * are optional: an empty one counts as missing. The private key may be on
 * one line, with `\n` for its line breaks.
 */
export type FeedbackTrackerSettings = Partial<FeedbackApp> & {
  /** The repo Feedback is filed in, as `owner/name`. */
  repo: string;
  /** The `repo:` label every Feedback issue carries, e.g. `repo:marketplace`. */
  repoLabel: string;
  /** The `fetch` to call GitHub with. Defaults to the global one; tests pass a stub. */
  fetch?: typeof fetch;
};

const settingNames: Record<keyof FeedbackApp, string> = {
  appId: "FEEDBACK_APP_ID",
  privateKey: "FEEDBACK_APP_PRIVATE_KEY",
  installationId: "FEEDBACK_APP_INSTALLATION_ID",
};

/**
 * The Tracker for these settings. With all of the Feedback App's credentials
 * it is the GitHub tracker, filing Feedback as the App. With none it only
 * logs Feedback, so local development, the checks and the journey never file
 * real Tickets. With some but not all, it only logs too, and warns which
 * settings are missing. Either way every issue carries the `repo:` label.
 */
export function feedbackTracker({
  repo,
  repoLabel,
  fetch,
  ...credentials
}: FeedbackTrackerSettings): Tracker {
  const tracker = chooseTracker(credentials, repo, fetch);
  return {
    openIssue: (issue) => tracker.openIssue({ ...issue, labels: [...issue.labels, repoLabel] }),
  };
}

function chooseTracker(
  credentials: Partial<FeedbackApp>,
  repo: string,
  fetch: typeof globalThis.fetch | undefined,
): Tracker {
  const { appId, privateKey, installationId } = credentials;
  if (appId && privateKey && installationId) {
    return githubTracker({
      appId,
      privateKey: privateKey.replaceAll("\\n", "\n"),
      installationId,
      repo,
      fetch,
    });
  }
  const settings = Object.entries(settingNames);
  const missing = settings.filter(([key]) => !credentials[key as keyof FeedbackApp]);
  if (missing.length < settings.length) {
    const names = missing.map(([, name]) => name).join(", ");
    console.warn(
      `Feedback is only logged: the Feedback App's credentials are incomplete. Missing: ${names}.`,
    );
  }
  return loggingTracker;
}
