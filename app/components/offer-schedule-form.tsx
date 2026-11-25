import { Form } from "react-router";
import type { DeliverySchedule } from "~/db/schema";
import { deliveryScheduleOptions } from "~/modules/deliveries";

/**
 * A small form to offer one more Delivery Schedule for a Product, or offer
 * again one the Vendor stopped. Nothing when it offers every schedule.
 */
export function OfferScheduleForm({
  product,
}: {
  product: { id: number; name: string; deliverySchedules: DeliverySchedule[] };
}) {
  const missing = deliveryScheduleOptions.filter(
    (option) => !product.deliverySchedules.includes(option.value),
  );
  if (missing.length === 0) return null;
  return (
    <Form
      method="post"
      action={`/vendor/products/${product.id}/schedules`}
      className="mt-2 flex items-center gap-2 text-sm"
    >
      <select
        name="schedule"
        aria-label={`Delivery Schedule to offer for ${product.name}`}
        className="rounded border border-line-strong px-2 py-1"
      >
        {missing.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        aria-label={`Offer another Delivery Schedule for ${product.name}`}
        className="underline"
      >
        Offer it
      </button>
    </Form>
  );
}
