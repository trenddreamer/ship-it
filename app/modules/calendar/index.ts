// Entry point: calendar dates. The Marketplace's days are calendar dates in
// Africa/Johannesburg, written "YYYY-MM-DD". No module reads the clock: a
// route works out today with `johannesburgDate(new Date())` (see
// app/today.server.ts) and passes it in.
export {
  addDays,
  formatCalendarDate,
  johannesburgDate,
  type CalendarDate,
} from "./lib/calendar-date";
