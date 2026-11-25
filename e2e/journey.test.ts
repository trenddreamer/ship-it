// The Marketplace journey, end to end, through the browser only.
//
// One journey, one ordered walk: the steps live in e2e/journey/, one file per
// stretch of the story, numbered in order, and run here in that order inside
// one `test.describe.serial` block. Each ticket appends the steps its slice
// makes possible to the last file (or starts the next one when that nears the
// token limit). The steps share the one database the run started with, so a
// later step sees what an earlier one did, and a failing step skips the rest.
// Never import from `app/`: the journey sees only what a person sees. Run it
// with `npm run test:journey` (see e2e/run.ts).
import { test } from "@playwright/test";
import { visitorAndAccountSteps } from "./journey/1-visitors-and-accounts";
import { vendorAndProductSteps } from "./journey/2-vendors-and-products";
import { subscribingSteps } from "./journey/3-subscribing";
import { deliveryAndPriceSteps } from "./journey/4-deliveries-and-prices";

test.describe.serial("Marketplace journey", () => {
  visitorAndAccountSteps();
  vendorAndProductSteps();
  subscribingSteps();
  deliveryAndPriceSteps();
});
