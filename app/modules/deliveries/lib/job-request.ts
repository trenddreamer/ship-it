import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { CalendarDate } from "~/modules/calendar";

/** How the job's route is configured. */
export interface JobSettings {
  /** What callers send as `Authorization: Bearer <secret>` (Vercel Cron sends CRON_SECRET so). */
  secret: string;
  /** Whether a caller may pick the day with `?today=YYYY-MM-DD`. Never in production. */
  acceptsToday: boolean;
}

/** Whether to run the job, and for which day; or why not, as an HTTP status. */
export type JobRequest =
  { ok: true; today: CalendarDate } | { ok: false; status: 400 | 401; message: string };

/**
 * What a request to run the job says: its Authorization header (missing is
 * ""), and the `?today=` it asks for: undefined when it asks for none, null
 * when what it asks for isn't a date. It never fails, so `readJobRequest`
 * can check the secret before it says anything about the date.
 */
export const jobRequestSchema = z.object({
  authorization: z.string().default(""),
  today: z.iso.date().nullable().catch(null).optional(),
});

export type JobInput = z.infer<typeof jobRequestSchema>;

/**
 * Decides a request to run the daily job. Refused (401) without the secret.
 * With it, the job runs for `realToday`, or for the caller's `today` when
 * the settings accept one, so tests can move time forward. A `today` where
 * none is accepted, or one that isn't a date, is refused (400).
 */
export function readJobRequest(
  input: JobInput,
  settings: JobSettings,
  realToday: CalendarDate,
): JobRequest {
  if (!sameSecret(input.authorization, `Bearer ${settings.secret}`)) {
    return { ok: false, status: 401, message: "This job needs its secret." };
  }
  if (input.today === undefined) return { ok: true, today: realToday };
  if (!settings.acceptsToday) {
    return { ok: false, status: 400, message: "This job runs only for the real today here." };
  }
  if (input.today === null) {
    return { ok: false, status: 400, message: "today must be a date, YYYY-MM-DD." };
  }
  return { ok: true, today: input.today };
}

/** Compares in constant time, so the response time doesn't give the secret away. */
function sameSecret(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected));
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
