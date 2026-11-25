import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("sign-in", "routes/sign-in.tsx"),
    route("sign-up", "routes/sign-up.tsx"),
    route("sign-up/vendor", "routes/sign-up-vendor.tsx"),
    route("sign-out", "routes/sign-out.tsx"),
    route("vendor", "routes/vendor.tsx"),
    route("vendor/products/new", "routes/vendor-products-new.tsx"),
    route("vendor/products/:productId/stop", "routes/vendor-products-stop.tsx"),
    route("vendor/products/:productId/price", "routes/vendor-products-price.tsx"),
    route("vendor/products/:productId/schedules", "routes/vendor-products-schedules.ts"),
    route("admin", "routes/admin.tsx"),
    route("inbox", "routes/inbox.tsx"),
    route("delivery-address", "routes/delivery-address.tsx"),
    route("products/:productId/subscribe", "routes/subscribe.tsx"),
    route("subscriptions", "routes/subscriptions.tsx"),
    route("charges", "routes/charges.tsx"),
  ]),
  route("jobs/create-due-deliveries", "routes/jobs.create-due-deliveries.ts"),
] satisfies RouteConfig;
