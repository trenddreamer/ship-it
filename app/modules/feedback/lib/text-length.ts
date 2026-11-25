/**
 * How long Feedback's text may be, in characters once trimmed. `giveFeedback`
 * refuses text outside it; the dialog's textarea uses it as its
 * `minLength`/`maxLength`, so the browser stops most such text before sending.
 */
export const feedbackTextLength = { min: 10, max: 2000 } as const;
