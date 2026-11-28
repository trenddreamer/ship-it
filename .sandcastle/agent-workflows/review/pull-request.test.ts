import { describe, expect, it } from "vitest";
import { ticketPullRequest } from "./pull-request.ts";

const HOME = "trenddreamer/ship-it";
const elsewhere = { home: HOME, enrolled: "trenddreamer/marketplace", ticket: 47 };

const pr = (number: number, body: string) => ({ number, body });

describe("ticketPullRequest", () => {
  it("finds the pull request that closes the Ticket in the Home repo", () => {
    expect(
      ticketPullRequest(
        [
          pr(3, "Closes trenddreamer/ship-it#46. Built unattended."),
          pr(5, "Adds a button.\n\n---\n\nCloses trenddreamer/ship-it#47. Built unattended."),
        ],
        elsewhere,
      ),
    ).toBe(5);
  });

  it("takes the newest when a retry opened a second pull request for the Ticket", () => {
    expect(
      ticketPullRequest(
        [
          pr(4, "Closes trenddreamer/ship-it#47."),
          pr(9, "Closes trenddreamer/ship-it#47."),
          pr(6, "Closes trenddreamer/ship-it#47."),
        ],
        elsewhere,
      ),
    ).toBe(9);
  });

  it("finds none when no open pull request closes the Ticket", () => {
    expect(
      ticketPullRequest(
        [pr(2, "Closes trenddreamer/ship-it#470."), pr(3, "Mentions trenddreamer/ship-it#47.")],
        elsewhere,
      ),
    ).toBeUndefined();
  });

  it.each(["fixes", "Resolved", "CLOSE", "closed:", "fix", "resolves"])(
    "takes any of GitHub's closing keywords (%s)",
    (keyword) => {
      expect(ticketPullRequest([pr(8, `${keyword} trenddreamer/ship-it#47`)], elsewhere)).toBe(8);
    },
  );

  it("doesn't take a word that only ends in a keyword", () => {
    expect(ticketPullRequest([pr(8, "Discloses trenddreamer/ship-it#47")], elsewhere)).toBe(
      undefined,
    );
  });

  it("doesn't take a Ticket of the same number in another repo", () => {
    expect(
      ticketPullRequest(
        [pr(2, "Closes trenddreamer/marketplace#47."), pr(3, "Closes #47.")],
        elsewhere,
      ),
    ).toBeUndefined();
  });

  it("takes a bare `#n` when the pull request is in the Home repo itself", () => {
    const atHome = { home: HOME, enrolled: HOME, ticket: 47 };
    expect(ticketPullRequest([pr(3, "Closes #47.")], atHome)).toBe(3);
  });

  it("takes the full form too when the pull request is in the Home repo itself", () => {
    const atHome = { home: HOME, enrolled: HOME, ticket: 47 };
    expect(ticketPullRequest([pr(3, "Closes trenddreamer/ship-it#47.")], atHome)).toBe(3);
  });

  it("reads the Home repo's name literally", () => {
    const dotted = { home: "trenddreamer/ship.it", enrolled: "trenddreamer/app", ticket: 47 };
    expect(ticketPullRequest([pr(3, "Closes trenddreamer/shipXit#47.")], dotted)).toBeUndefined();
    expect(ticketPullRequest([pr(4, "Closes trenddreamer/ship.it#47.")], dotted)).toBe(4);
  });

  it("names the Home repo in any case, as GitHub does", () => {
    expect(ticketPullRequest([pr(3, "Closes TrendDreamer/Ship-It#47")], elsewhere)).toBe(3);
  });
});
