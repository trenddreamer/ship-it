import { Link } from "react-router";
import type { DeliverySchedule } from "~/db/schema";
import { deliveryScheduleLabel } from "~/modules/deliveries";

/**
 * Links to stop selling a Product, or one of its Delivery Schedules. Each
 * leads to a page that says how many Subscriptions it cancels, to confirm.
 * A Product's only schedule has no link of its own: stopping it is stopping
 * the Product.
 */
export function StopLinks({
  product,
}: {
  product: { id: number; name: string; deliverySchedules: DeliverySchedule[] };
}) {
  const stopPage = `/vendor/products/${product.id}/stop`;
  return (
    <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
      <Link
        to={stopPage}
        aria-label={`Stop selling ${product.name}`}
        className="text-red-700 underline"
      >
        Stop selling
      </Link>
      {product.deliverySchedules.length > 1 &&
        product.deliverySchedules.map((schedule) => {
          const label = deliveryScheduleLabel(schedule).toLowerCase();
          return (
            <Link
              key={schedule}
              to={`${stopPage}?schedule=${schedule}`}
              aria-label={`Stop delivering ${product.name} ${label}`}
              className="text-red-700 underline"
            >
              Stop delivering {label}
            </Link>
          );
        })}
    </p>
  );
}
