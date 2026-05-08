// CSC service catalogue taxonomy.
// Locked list — derived from the printed services poster + the operator
// charge sheet. Add a category here only when the business itself adds a
// new section, not for one-off services.
export const SERVICE_CATEGORIES = [
  "GST Services",
  "Income Tax Services",
  "Registration Services",
  "DSC Services",
  "Accounting Services",
  "Business & Legal Services",
  "E-way Bill Services",
  "Government Services",
  "Website & Digital Marketing",
  "Other Services",
  "Misc",
  // ── Charge-sheet sections (operator-facing groupings) ──
  "Aadhaar Services",
  "PAN Services",
  "ID & Certificate Services",
  "Passport Services",
  "RTO & Driving Services",
  "Print, Scan & Photo Services",
  "Payment & Banking Services",
  "EPFO & Pension Services",
  "Insurance Services",
  "Travel & Railway Services",
  "Education & Scholarship Services",
  "Government Schemes",
  "Combo Bundles",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return (
    typeof value === "string" &&
    (SERVICE_CATEGORIES as readonly string[]).includes(value)
  );
}
