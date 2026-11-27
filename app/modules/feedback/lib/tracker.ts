/** An issue for the Factory: what a Tracker opens for one piece of Feedback. */
export type TrackerIssue = { title: string; body: string; labels: string[] };

/**
 * Where Feedback goes. It opens one issue and returns its URL, when it has
 * one. It throws when the issue couldn't be opened.
 */
export type Tracker = {
  openIssue(issue: TrackerIssue): Promise<string | undefined>;
};

/**
 * A Tracker that opens nothing: it writes what would have been sent to the
 * server console and returns no URL. For when the Feedback App isn't configured.
 */
export const loggingTracker: Tracker = {
  async openIssue(issue) {
    console.log(
      `Feedback (not sent, no tracker configured)\nTitle: ${issue.title}\nLabels: ${issue.labels.join(", ")}\n\n${issue.body}`,
    );
    return undefined;
  },
};
