import { describe, expect, it } from "vitest";
import { addDays, formatCalendarDate, johannesburgDate } from "../index";

describe("johannesburgDate", () => {
  it("is the calendar date in Johannesburg, two hours ahead of UTC", () => {
    expect(johannesburgDate(new Date("2026-11-25T21:59:59Z"))).toBe("2026-11-25");
    expect(johannesburgDate(new Date("2026-11-25T22:00:00Z"))).toBe("2026-11-26");
  });

  it("pads single-digit months and days", () => {
    expect(johannesburgDate(new Date("2026-03-04T08:00:00Z"))).toBe("2026-03-04");
  });
});

describe("addDays", () => {
  it("moves within a month and across one", () => {
    expect(addDays("2026-11-25", 1)).toBe("2026-11-26");
    expect(addDays("2026-11-25", 14)).toBe("2026-12-09");
  });

  it("crosses year ends and leap days", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("goes backwards with a negative number", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("formatCalendarDate", () => {
  it("shows the date in South African English", () => {
    expect(formatCalendarDate("2026-11-26")).toBe("26 November 2026");
    expect(formatCalendarDate("2027-01-01")).toBe("1 January 2027");
  });
});
