import { describe, expect, it } from "vitest";
import { jobRequestSchema, readJobRequest } from "../server";

const secret = "the-cron-secret";

/** What the route reads from an HTTP request: the Authorization header and `?today=`. */
function input(
  today: string | undefined = undefined,
  authorization: string | null = `Bearer ${secret}`,
) {
  return jobRequestSchema.parse({ authorization: authorization ?? undefined, today });
}

describe("jobRequestSchema", () => {
  it("reads a missing header as no secret, and a missing today as none", () => {
    expect(jobRequestSchema.parse({})).toEqual({ authorization: "", today: undefined });
  });

  it("keeps a today that is a date", () => {
    expect(jobRequestSchema.parse({ authorization: "x", today: "2026-12-01" })).toEqual({
      authorization: "x",
      today: "2026-12-01",
    });
  });

  it.each(["2026-13-01", "2026-02-30", "tomorrow", ""])(
    "reads %j as a today that isn't a date",
    (today) => {
      expect(jobRequestSchema.parse({ authorization: "x", today }).today).toBeNull();
    },
  );
});

describe("readJobRequest", () => {
  it("runs for the real today when called with the secret", () => {
    expect(readJobRequest(input(), { secret, acceptsToday: false }, "2026-11-25")).toEqual({
      ok: true,
      today: "2026-11-25",
    });
  });

  it.each([
    ["no Authorization header", null],
    ["a wrong secret", "Bearer not-the-secret"],
    ["the secret without Bearer", secret],
    ["a longer secret", `Bearer ${secret}x`],
  ])("refuses a caller with %s", (_, authorization) => {
    expect(
      readJobRequest(input(undefined, authorization), { secret, acceptsToday: true }, "2026-11-25"),
    ).toEqual({ ok: false, status: 401, message: "This job needs its secret." });
  });

  it("takes the caller's today where that is accepted", () => {
    expect(
      readJobRequest(input("2026-12-01"), { secret, acceptsToday: true }, "2026-11-25"),
    ).toEqual({ ok: true, today: "2026-12-01" });
  });

  it("refuses a caller's today where it isn't accepted", () => {
    expect(
      readJobRequest(input("2026-12-01"), { secret, acceptsToday: false }, "2026-11-25"),
    ).toEqual({ ok: false, status: 400, message: "This job runs only for the real today here." });
  });

  it.each(["2026-13-01", "tomorrow", ""])("refuses %j as a today", (today) => {
    expect(readJobRequest(input(today), { secret, acceptsToday: true }, "2026-11-25")).toEqual({
      ok: false,
      status: 400,
      message: "today must be a date, YYYY-MM-DD.",
    });
  });

  it("refuses a today that isn't a date where none is accepted", () => {
    expect(
      readJobRequest(input("nonsense"), { secret, acceptsToday: false }, "2026-11-25"),
    ).toEqual({
      ok: false,
      status: 400,
      message: "This job runs only for the real today here.",
    });
  });

  it("checks the secret before the today", () => {
    expect(
      readJobRequest(input("nonsense", null), { secret, acceptsToday: false }, "2026-11-25"),
    ).toMatchObject({ ok: false, status: 401 });
  });
});
