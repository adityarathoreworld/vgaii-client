// All money in the payment diary is stored as integer paise (₹ × 100) so
// the database never sees a float. Helpers here translate to/from the
// rupee values that the UI and CSV exports show.

export const rupeesToPaise = (rupees: number): number =>
  Math.round(rupees * 100);

export const paiseToRupees = (paise: number): number => paise / 100;

// Render an integer paise value as "₹1,250" / "₹1,250.50". Trailing zeros
// after the decimal are hidden so whole-rupee charges look clean.
export const formatRupees = (paise: number): string => {
  const rupees = paise / 100;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
  return `₹${formatted}`;
};
