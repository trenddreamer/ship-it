// Entry point: what the browser may use from Accounts. Components import from
// here, never from `./index`, which brings in the database and password
// hashing (`node:crypto`). Pulled into the browser bundle, that code breaks
// the page's hydration.
export { type DeliveryAddress } from "./lib/delivery-address";
export { deliveryAddressLine } from "./lib/delivery-address-line";
