import { Form } from "react-router";
import { FormError } from "~/components/text-field";
import { deliveryAddressLine, type DeliveryAddress } from "~/modules/accounts";

interface ShownDelivery {
  id: number;
  /** The due date, formatted, e.g. "26 November 2026". */
  dueOn: string;
  productName: string;
  customerEmail: string;
  deliveryAddress: DeliveryAddress;
  /** The recorded Price, formatted. */
  price: string;
}

/**
 * A Vendor's due, unshipped Deliveries, for the Vendor page, each with a
 * "Mark shipped" button that posts `deliveryId` to the page's action.
 */
export function DueDeliveries({
  deliveries,
  formError,
}: {
  deliveries: ShownDelivery[];
  /** Why the last "Mark shipped" was refused, if it was. */
  formError?: string;
}) {
  return (
    <section aria-labelledby="due-deliveries-heading" className="mt-8">
      <h2 id="due-deliveries-heading" className="text-xl font-semibold">
        Deliveries due
      </h2>
      <div className="mt-4">
        <FormError message={formError} />
      </div>
      {deliveries.length === 0 ? (
        <p className="mt-4 italic text-muted">No Deliveries are due.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {deliveries.map((delivery) => {
            return (
              <li key={delivery.id} className="flex justify-between gap-6 py-3">
                <div>
                  <h3 className="font-medium">{delivery.productName}</h3>
                  <p className="text-sm">Due {delivery.dueOn}</p>
                  <p className="text-sm text-muted">
                    To {delivery.customerEmail}, {deliveryAddressLine(delivery.deliveryAddress)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{delivery.price}</p>
                  <Form method="post" className="mt-1">
                    <input type="hidden" name="deliveryId" value={delivery.id} />
                    <button
                      type="submit"
                      aria-label={`Mark ${delivery.productName} for ${delivery.customerEmail} shipped`}
                      className="rounded border border-line-strong px-3 py-1 text-sm"
                    >
                      Mark shipped
                    </button>
                  </Form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
