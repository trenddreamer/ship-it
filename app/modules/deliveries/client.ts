// Entry point: what the browser may use from Deliveries, and the one place
// anything imports the Delivery Schedule names from. Components import
// from here, never from `./index`, which also exports code that reads and
// writes the database (`shipDelivery`, `createDueDeliveries`, …).
export { deliveryScheduleLabel, deliveryScheduleOptions } from "./lib/schedule-options";
