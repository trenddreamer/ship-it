import type { DeliveryAddress } from "./delivery-address";

/** A Delivery Address on one line, every part in order: "street, suburb, city, postal code". */
export function deliveryAddressLine(address: DeliveryAddress): string {
  return [address.street, address.suburb, address.city, address.postalCode].join(", ");
}
