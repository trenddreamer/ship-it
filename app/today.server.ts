// What day it is, for loaders and actions. Modules never read the clock;
// a route calls `today()` and passes the date in.
import { johannesburgDate, type CalendarDate } from "~/modules/calendar";

/** Today's calendar date in Africa/Johannesburg, e.g. "2026-11-25". */
export function today(): CalendarDate {
  return johannesburgDate(new Date());
}
