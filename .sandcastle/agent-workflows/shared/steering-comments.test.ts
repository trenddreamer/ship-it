import { describe, expect, it } from "vitest";
import { type IssueComment, steeringComments } from "./steering-comments";

const FACTORY_BOT = "ship-it-factory[bot]";

const comment = (overrides: Partial<IssueComment>): IssueComment => ({
  user: { login: "trenddreamer", type: "User" },
  author_association: "OWNER",
  created_at: "2026-11-27T10:00:00Z",
  body: "Use the existing price formatter.",
  ...overrides,
});

describe("steeringComments", () => {
  it("keeps the Owner's comment, as author, time and body", () => {
    expect(steeringComments([comment({})], FACTORY_BOT)).toEqual([
      {
        author: "trenddreamer",
        createdAt: "2026-11-27T10:00:00Z",
        body: "Use the existing price formatter.",
      },
    ]);
  });

  it("keeps comments from members and collaborators", () => {
    const kept = steeringComments(
      [
        comment({ author_association: "MEMBER", body: "member" }),
        comment({ author_association: "COLLABORATOR", body: "collaborator" }),
      ],
      FACTORY_BOT,
    );

    expect(kept.map((c) => c.body)).toEqual(["member", "collaborator"]);
  });

  it("drops a comment from someone without write access", () => {
    const stranger = { login: "stranger", type: "User" };

    expect(
      steeringComments(
        [
          comment({ user: stranger, author_association: "CONTRIBUTOR" }),
          comment({ user: stranger, author_association: "NONE" }),
        ],
        FACTORY_BOT,
      ),
    ).toEqual([]);
  });

  // GitHub gives an App's comments CONTRIBUTOR or NONE, never write access,
  // and explore's findings are what the implementer most needs.
  it("keeps the Factory bot's findings, whatever its association", () => {
    const factory = { login: FACTORY_BOT, type: "Bot" };

    const kept = steeringComments(
      [
        comment({ user: factory, author_association: "CONTRIBUTOR", body: "findings" }),
        comment({ user: factory, author_association: "NONE", body: "more findings" }),
      ],
      FACTORY_BOT,
    );

    expect(kept).toEqual([
      { author: FACTORY_BOT, createdAt: "2026-11-27T10:00:00Z", body: "findings" },
      { author: FACTORY_BOT, createdAt: "2026-11-27T10:00:00Z", body: "more findings" },
    ]);
  });

  // Feedback is a stranger's words: a description, never instructions.
  it("never keeps another bot's comment, such as the Feedback bot's", () => {
    const feedback = { login: "ship-it-feedback[bot]", type: "Bot" };

    expect(
      steeringComments(
        [
          comment({ user: feedback, author_association: "NONE" }),
          comment({ user: feedback, author_association: "OWNER" }),
        ],
        FACTORY_BOT,
      ),
    ).toEqual([]);
  });

  it("does not take a user named like the App's slug for the Factory bot", () => {
    const lookalike = { login: "ship-it-factory", type: "User" };

    expect(
      steeringComments([comment({ user: lookalike, author_association: "NONE" })], FACTORY_BOT),
    ).toEqual([]);
  });

  it("drops the Factory's status lines, whoever posted them", () => {
    const status = "Building — [logs](https://example.test). <!-- factory:status -->";
    const factory = { login: FACTORY_BOT, type: "Bot" };

    expect(
      steeringComments(
        [
          comment({ user: factory, author_association: "NONE", body: status }),
          comment({ body: status }),
        ],
        FACTORY_BOT,
      ),
    ).toEqual([]);
  });

  it("drops a comment by a deleted account", () => {
    expect(
      steeringComments([comment({ user: null, author_association: "NONE" })], FACTORY_BOT),
    ).toEqual([]);
  });
});
