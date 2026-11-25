import type { DeliverySchedule } from "~/db/schema";
import { addDays, type CalendarDate } from "~/modules/calendar";

/**
 * The due date of the Delivery after the one due on `dueOn`, on a Delivery
 * Schedule whose first Delivery was due on `firstDueOn`.
 */
export function dueDateAfter(
  _schedule: DeliverySchedule,
  _firstDueOn: CalendarDate,
  dueOn: CalendarDate,
): CalendarDate {
  return addDays(dueOn, 7);
}
