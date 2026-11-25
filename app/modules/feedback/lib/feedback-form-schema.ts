import { z } from "zod";

/**
 * The Feedback form as it arrives: the `text` typed and the `page` (a path,
 * e.g. `/subscriptions`) it was given on. Parse
 * `Object.fromEntries(await request.formData())` with it. Only the shape:
 * `giveFeedback` checks the text's length, with the reason to show.
 */
export const feedbackFormSchema = z.object({
  text: z.string(),
  page: z.string().startsWith("/"),
});
