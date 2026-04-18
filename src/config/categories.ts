export const SERVICE_CATEGORIES = [
  "Govt Services",
  "Banking & Payments",
  "Education",
  "Healthcare",
  "Financial Services",
  "Auto & Insurance",
  "Utility Bills",
  "Travel",
  "Miscellaneous",
  "Other",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
