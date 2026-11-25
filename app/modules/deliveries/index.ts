// Entry point: Deliveries. Deliveries fall due by themselves on each
// Subscription's Delivery Schedule, recording the Price they will be charged;
// a Vendor sees their due, unshipped ones. Every function that depends on the
// date takes "today" as a CalendarDate in Africa/Johannesburg (see
// ~/modules/calendar); none reads the clock.
export { createDueDeliveries } from "./lib/create-due-deliveries";
export { catchUpSubscription } from "./lib/catch-up";
export { listVendorDueDeliveries, type DueDelivery } from "./lib/vendor-due-deliveries";
