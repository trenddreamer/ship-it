import { describe, expect, it } from "vitest";
import { readJobRequest } from "../server";

const url = "https://ship-it.test/jobs/create-due-deliveries";
const secret = "the-cron-secret";

function request(path = url, authorization: string | null = `Bearer ${secret}`) {
  return new Request(path, authorization ? { headers: { authorization } } : {});
}

describe("readJobRequest", () => {
  it("runs for the real today when called with the secret", () => {
    expect(readJobRequest(request(), { secret, acceptsToday: false }, "2026-11-25")).toEqual({
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
      readJobRequest(request(url, authorization), { secret, acceptsToday: true }, "2026-11-25"),
    ).toEqual({ ok: false, status: 401, message: "This job needs its secret." });
  });

  it("takes the caller's today where that is accepted", () => {
    expect(
      readJobRequest(
        request(`${url}?today=2026-12-01`),
        { secret, acceptsToday: true },
        "2026-11-25",
      ),
    ).toEqual({ ok: true, today: "2026-12-01" });
  });

  it("refuses a caller's today where it isn't accepted", () => {
    expect(
      readJobRequest(
        request(`${url}?today=2026-12-01`),
        { secret, acceptsToday: false },
        "2026-11-25",
      ),
    ).toEqual({ ok: false, status: 400, message: "This job runs only for the real today here." });
  });

  it.each(["2026-13-01", "2026-02-30", "tomorrow", ""])("refuses %j as a today", (today) => {
    expect(
      readJobRequest(
        request(`${url}?today=${today}`),
        { secret, acceptsToday: true },
        "2026-11-25",
      ),
    ).toEqual({ ok: false, status: 400, message: "today must be a date, YYYY-MM-DD." });
  });

  it("checks the secret before the today", () => {
    expect(
      readJobRequest(
        request(`${url}?today=nonsense`, null),
        { secret, acceptsToday: false },
        "2026-11-25",
      ),
    ).toMatchObject({ ok: false, status: 401 });
  });
});
