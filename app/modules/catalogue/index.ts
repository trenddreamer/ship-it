// Entry point: the catalogue. The Products Vendors sell, their Price and
// the Delivery Schedules each one offers. A Vendor changes a Price; each change
// is kept, dated, and Customers already subscribed are notified.
export {
  addProduct,
  findVendorProduct,
  listVendorProducts,
  type CatalogueProduct,
  type NewProduct,
} from "./lib/products";
export { newProductSchema } from "./lib/new-product-schema";
export { productParamsSchema } from "./lib/product-params-schema";
export {
  previewStop,
  stopSelling,
  type StopPreview,
  type StopRefusal,
  type StopResult,
} from "./lib/stop";
export { stopSchema } from "./lib/stop-schema";
export {
  changePrice,
  type ChangePriceRefusal,
  type ChangePriceResult,
  type PriceChange,
} from "./lib/change-price";
export { changePriceSchema } from "./lib/change-price-schema";
