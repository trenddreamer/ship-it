// Entry point: the catalogue. The Products Vendors sell, their Price and
// the Delivery Schedules each one offers. A Vendor changes a Price; each change
// is kept, dated, and existing subscribers are notified.
export {
  addProduct,
  listVendorProducts,
  type CatalogueProduct,
  type NewProduct,
} from "./lib/products";
export { deliveryScheduleOptions, newProductSchema } from "./lib/new-product-schema";
export {
  changePrice,
  type ChangePriceRefusal,
  type ChangePriceResult,
  type PriceChange,
} from "./lib/change-price";
