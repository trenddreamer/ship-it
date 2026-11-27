// A resource route (no page): the layout's Feedback dialog posts here, with
// useFetcher, so giving Feedback never leaves the page. Any signed-in Account
// may give it. The answer is the feedback module's result, as data.
import { data } from "react-router";
import { requireAccount } from "~/accounts.server";
import { config } from "~/config.server";
import { db } from "~/db/client.server";
import {
  currentCommit,
  feedbackFormSchema,
  feedbackTracker,
  giveFeedback,
} from "~/modules/feedback/server";
import type { Route } from "./+types/feedback";

// A real GitHub issue only when the Feedback App is configured: never from the checks or the journey.
const tracker = feedbackTracker(config.feedback);

export async function action({ request }: Route.ActionArgs) {
  const account = await requireAccount(request, "customer", "vendor", "admin");
  const parsed = feedbackFormSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return data({ kind: "invalid" as const, reason: "Write your Feedback in the box." }, 400);
  }
  return giveFeedback(db, tracker, { account, ...parsed.data, commit: currentCommit() });
}
