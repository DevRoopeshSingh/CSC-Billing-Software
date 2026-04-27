// src/app/billing/page.tsx
// Prevent 404 when anything navigates to /billing.
// The canonical new-invoice route is /billing/new.
import { redirect } from "next/navigation";

export default function BillingPage() {
  redirect("/billing/new");
}
