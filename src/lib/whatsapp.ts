// src/lib/whatsapp.ts
// Utilities for building WhatsApp deep-links from stored mobile numbers.
// The wa.me scheme auto-opens WhatsApp on mobile/desktop without needing the
// "+" prefix — we normalise to 91XXXXXXXXXX for Indian numbers.

/**
 * Build a WhatsApp chat URL that pre-fills a message body.
 * @param mobile  Raw mobile string from the DB (digits only, with or without country code)
 * @param message The pre-filled message text
 */
export function buildWhatsAppUrl(mobile: string, message: string): string {
  const digits = mobile.replace(/\D/g, "");
  // Treat 10-digit numbers as Indian (+91). Numbers that already start with
  // a valid country code (1–3 digits before 10 local digits) are kept as-is.
  const withCountry =
    digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/**
 * Build the default "pending payment" reminder message for an invoice.
 */
export function buildPaymentReminderMessage(params: {
  customerName: string;
  invoiceNo: string;
  amount: string;
  centerName?: string;
}): string {
  const center = params.centerName ? `${params.centerName}` : "our center";
  return (
    `Dear ${params.customerName},\n\n` +
    `This is a gentle reminder that your invoice *${params.invoiceNo}* ` +
    `of *${params.amount}* from ${center} is still pending.\n\n` +
    `Please make the payment at your earliest convenience.\n\n` +
    `Thank you! 🙏`
  );
}
