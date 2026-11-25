// Entry point: the daily job's HTTP side. Who may run createDueDeliveries
// over HTTP, and for which day.
export { readJobRequest, type JobRequest, type JobSettings } from "./lib/job-request";
