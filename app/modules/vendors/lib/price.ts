/** Formats a Price held in whole cents as rands, e.g. 15000 → "R150.00". */
export function formatRands(cents: number): string {
  const rands = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, "0");
  // Group thousands with a space, as is usual in South Africa: R1 250.00.
  const grouped = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `R${grouped}.${remainder}`;
}
