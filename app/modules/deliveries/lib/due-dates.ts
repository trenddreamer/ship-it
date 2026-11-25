import type { DeliverySchedule } from "~/db/schema";
import { addDays, type CalendarDate } from "~/modules/calendar";

/**
 * The due date of the Delivery after the one due on `dueOn`, on a Delivery
 * Schedule whose first Delivery was due on `firstDueOn`. Weekly and every two
 * weeks add 7 and 14 days. Monthly keeps the day of the month of the first
 * Delivery, or falls on the month's last day when that day doesn't exist.
 */
export function dueDateAfter(
  schedule: DeliverySchedule,
  firstDueOn: CalendarDate,
  dueOn: CalendarDate,
): CalendarDate {
  switch (schedule) {
    case "weekly":
      return addDays(dueOn, 7);
    case "every-two-weeks":
      return addDays(dueOn, 14);
    case "monthly":
      return monthlyDueDate(firstDueOn, monthsBetween(firstDueOn, dueOn) + 1);
  }
}

/** The due date `months` months after the first one, on its day of the month or the last day. */
function monthlyDueDate(firstDueOn: CalendarDate, months: number): CalendarDate {
  const first = parts(firstDueOn);
  const monthIndex = first.month - 1 + months;
  const year = first.year + Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(first.day, lastDay);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthsBetween(from: CalendarDate, to: CalendarDate): number {
  const a = parts(from);
  const b = parts(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

function parts(date: CalendarDate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
