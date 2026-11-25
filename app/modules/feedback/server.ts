// Entry point (server only): Feedback. A signed-in Account gives Feedback in
// their own words; it goes to the Factory as a public issue through a
// Tracker, and the Marketplace records only who gave it and when.
// `currentCommit` and `commitLine` work out which commit the Marketplace is
// running, for the footer's `Commit:` line: `currentCommit` gathers the
// inputs itself, and `commitLine` computes the line from inputs passed in.
export { giveFeedback, type FeedbackResult, type GiveFeedback } from "./lib/give-feedback";
export { loggingTracker, type Tracker, type TrackerIssue } from "./lib/tracker";
export { commitLine, currentCommit, type CommitInputs } from "./lib/commit";
