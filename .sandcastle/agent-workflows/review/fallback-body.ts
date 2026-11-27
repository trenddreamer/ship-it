// What the review workflow knows when its push to the pull request's branch
// was rejected and it opens a pull request of its own for the fixes: the Home
// repo the Ticket lives in (`owner/name`), the Ticket's number there, the pull
// request it reviewed (`pr`, a number in the Enrolled repo), that pull
// request's branch and base, the Enrolled repo's default branch, and the run.
export type Rejected = {
  home: string;
  ticket: number;
  pr: number;
  branch: string;
  base: string;
  defaultBranch: string;
  runUrl: string;
};

// The body of the fallback pull request. It holds the reviewed pull request's
// commits and the review's fixes, against the same base, so it stands in for
// that pull request: the Owner keeps one of the two and closes the other.
//
// Whichever is merged into the default branch must close the Ticket, so into
// the default branch it carries the same cross-repo `Closes` as the one it
// stands in for. Closing the other without merging it closes nothing. Into
// any other branch GitHub ignores closing keywords, so it carries none, and
// says which pull request has to close the Ticket instead. Its wording there
// avoids "close <ref>" too, which GitHub would read as one if the pull
// request were ever retargeted.
export const fallbackBody = ({
  home,
  ticket,
  pr,
  branch,
  base,
  defaultBranch,
  runUrl,
}: Rejected): string => {
  const intoDefault = base === defaultBranch;
  return [
    `The review run on #${pr} committed fixes on top of \`${branch}\`, but \`${branch}\` moved during the run`,
    `and the push was rejected. These are those fixes, so they are not lost. Keep this pull request or #${pr},`,
    intoDefault
      ? "and close the other: whichever is merged closes the Ticket."
      : "and close the other.",
    "",
    intoDefault
      ? `Closes ${home}#${ticket}.`
      : `It targets \`${base}\`, not \`${defaultBranch}\`, so merging it leaves ${home}#${ticket} open: ` +
        "GitHub only closes an issue from a pull request into the default branch. " +
        `Whichever pull request finally reaches \`${defaultBranch}\` must keep its closing line for ${home}#${ticket}.`,
    "",
    `Built unattended by [this run](${runUrl}).`,
    "",
  ].join("\n");
};
