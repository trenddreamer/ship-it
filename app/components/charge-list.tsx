interface ShownCharge {
  id: number;
  productName: string;
  /** Who it's with: "From <Vendor>" for a Customer, "<Customer email>" for a Vendor. */
  party: string;
  /** The amount, formatted with `formatPrice`. */
  amount: string;
  /** The day it was charged, formatted, e.g. "26 November 2026". */
  chargedOn: string;
}

/** Charges, newest first as given, one listitem each. */
export function ChargeList({ charges, empty }: { charges: ShownCharge[]; empty: string }) {
  if (charges.length === 0) return <p className="mt-4 italic text-muted">{empty}</p>;
  return (
    <ul className="mt-4 divide-y divide-line">
      {charges.map((charge) => (
        <li key={charge.id} className="flex justify-between gap-6 py-3">
          <div>
            <h3 className="font-medium">{charge.productName}</h3>
            <p className="text-sm text-muted">{charge.party}</p>
            <p className="text-sm">Charged {charge.chargedOn}</p>
          </div>
          <p className="shrink-0 font-semibold">{charge.amount}</p>
        </li>
      ))}
    </ul>
  );
}
