// Entry point (server only): Feedback. A signed-in Account gives Feedback in
// their own words; it goes to the Factory as a public issue through a
// Tracker, and the Marketplace records only who gave it and when.
// `feedbackTracker` is the Tracker configuration asks for: with the Feedback
// App's credentials it opens a real GitHub issue as the App, and without them
// it only writes the issue to the server console, as `loggingTracker` does.
// `feedbackFormSchema` parses the Feedback form before it reaches
// `giveFeedback`.
// `currentCommit` and `commitLine` work out which commit the Marketplace is
// running, for the footer's `Commit:` line: `currentCommit` gathers the
// inputs itself, and `commitLine` computes the line from inputs passed in.
export { giveFeedback, type FeedbackResult, type GiveFeedback } from "./lib/give-feedback";
export { feedbackFormSchema } from "./lib/feedback-form-schema";
export { loggingTracker, type Tracker, type TrackerIssue } from "./lib/tracker";
export { feedbackTracker, type FeedbackTrackerSettings } from "./lib/feedback-tracker";
export { commitLine, currentCommit, type CommitInputs } from "./lib/commit";
