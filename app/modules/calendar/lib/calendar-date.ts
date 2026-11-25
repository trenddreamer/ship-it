/**
 * A calendar date, "YYYY-MM-DD", with no time of day and no time zone. The
 * Marketplace's dates are days in Africa/Johannesburg. Dates in this form
 * sort and compare correctly as strings.
 */
export type CalendarDate = string;

const johannesburg = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Johannesburg",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date in Johannesburg at this instant. */
export function johannesburgDate(instant: Date): CalendarDate {
  // en-CA formats dates as YYYY-MM-DD.
  return johannesburg.format(instant);
}

/** The date this many days after `date` (before it, when negative). */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const day = asUtcMidnight(date);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

// Not `dateStyle: "long"`: en-ZA pads the day with it ("01 January 2027").
const longDate = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** The date as people read it, e.g. "26 November 2026". */
export function formatCalendarDate(date: CalendarDate): string {
  return longDate.format(asUtcMidnight(date));
}

function asUtcMidnight(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00Z`);
}
