// The daily job (a resource route, no page): makes every due Delivery fall
// due. Vercel Cron calls it once a day (vercel.json) with CRON_SECRET; anyone
// without the secret is refused. Outside production a caller may pass
// `?today=YYYY-MM-DD` to move time forward (see app/config.server.ts).
import { config } from "~/config.server";
import { db } from "~/db/client.server";
import { createDueDeliveries } from "~/modules/deliveries";
import { readJobRequest } from "~/modules/deliveries/server";
import { today } from "~/today.server";
import type { Route } from "./+types/jobs.create-due-deliveries";

export async function loader({ request }: Route.LoaderArgs) {
  const job = readJobRequest(request, config.dueDeliveriesJob, today());
  if (!job.ok) return Response.json({ error: job.message }, { status: job.status });
  await createDueDeliveries(db, job.today);
  return Response.json({ ok: true, today: job.today });
}
