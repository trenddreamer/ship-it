// Entry point: Subscriptions. A Customer subscribes to a Product on one of
// its Delivery Schedules; Customers and Vendors see the active ones. Every
// function that depends on the date takes "today" as a CalendarDate in
// Africa/Johannesburg (see ~/modules/calendar); none reads the clock.
export {
  subscribe,
  type NewSubscription,
  type SubscribeRefusal,
  type SubscribeResult,
} from "./lib/subscribe";
export { subscribeSchema } from "./lib/subscribe-schema";
export {
  switchDeliverySchedule,
  type ScheduleSwitch,
  type SwitchRefusal,
  type SwitchResult,
} from "./lib/switch-schedule";
export { listCustomerSubscriptions, type CustomerSubscription } from "./lib/customer-subscriptions";
export { findSubscribableProduct, type SubscribableProduct } from "./lib/subscribable-product";
export {
  listVendorSubscriptions,
  type ProductSubscriptions,
  type VendorSubscription,
} from "./lib/vendor-subscriptions";
