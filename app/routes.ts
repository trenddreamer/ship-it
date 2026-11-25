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
    route("admin", "routes/admin.tsx"),
  ]),
] satisfies RouteConfig;
