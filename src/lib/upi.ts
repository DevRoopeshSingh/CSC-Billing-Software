/**
 * Build a UPI deep link for payment
 * Format: upi://pay?pa=...&pn=...&am=...&tn=...&cu=INR
 */
export function buildUpiLink(params: {
  upiId: string;
  amount: number;
  invoiceNo: string;
  name: string;
}): string {
  const tn = encodeURIComponent(`Invoice ${params.invoiceNo}`);
  const pn = encodeURIComponent(params.name);
  return `upi://pay?pa=${params.upiId}&pn=${pn}&am=${params.amount.toFixed(2)}&tn=${tn}&cu=INR`;
}
