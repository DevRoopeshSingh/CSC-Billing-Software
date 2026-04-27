// CSC service catalogue taxonomy.
// Locked list — derived from the printed services poster. Add a category here
// only when the business itself adds a new section, not for one-off services.
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
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return (
    typeof value === "string" &&
    (SERVICE_CATEGORIES as readonly string[]).includes(value)
  );
}
