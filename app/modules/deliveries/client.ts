// Entry point: what the browser may use from Deliveries. Components import
// from here, never from `./index`, which also exports code that reads and
// writes the database (`shipDelivery`, `createDueDeliveries`, …).
export { deliveryScheduleLabel, deliveryScheduleOptions } from "./lib/schedule-options";
