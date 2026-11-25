interface ShownDelivery {
  id: number;
  /** The due date, formatted, e.g. "26 November 2026". */
  dueOn: string;
  productName: string;
  customerEmail: string;
  deliveryAddress: { street: string; suburb: string; city: string; postalCode: string };
  /** The recorded Price, formatted. */
  price: string;
}

/** A Vendor's due, unshipped Deliveries, for the Vendor page. */
export function DueDeliveries({ deliveries }: { deliveries: ShownDelivery[] }) {
  return (
    <section aria-labelledby="due-deliveries-heading" className="mt-8">
      <h2 id="due-deliveries-heading" className="text-xl font-semibold">
        Deliveries due
      </h2>
      {deliveries.length === 0 ? (
        <p className="mt-4 italic text-gray-500">No Deliveries are due.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {deliveries.map((delivery) => {
            const { street, suburb, city, postalCode } = delivery.deliveryAddress;
            return (
              <li key={delivery.id} className="flex justify-between gap-6 py-3">
                <div>
                  <h3 className="font-medium">{delivery.productName}</h3>
                  <p className="text-sm">Due {delivery.dueOn}</p>
                  <p className="text-sm text-gray-600">
                    To {delivery.customerEmail}, {street}, {suburb}, {city}, {postalCode}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">{delivery.price}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
