import { deliverySchedules, type DeliverySchedule } from "~/db/schema";

const labels: Record<DeliverySchedule, string> = {
  weekly: "Weekly",
  "every-two-weeks": "Every two weeks",
  monthly: "Monthly",
};

/** A Delivery Schedule's name as shown to people, e.g. "Every two weeks". */
export function deliveryScheduleLabel(schedule: DeliverySchedule): string {
  return labels[schedule];
}

/** Each Delivery Schedule, in the fixed order, with its name as shown to people. */
export const deliveryScheduleOptions = deliverySchedules.map((value) => ({
  value,
  label: labels[value],
}));
