import { and, gte, lte } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function generateTallyCSV(startDate: Date, endDate: Date): Promise<string> {
  const db = getDb();
  
  // Fetch invoices within the date range, including items and customer
  const rows = await db.query.invoices.findMany({
    where: and(
      gte(schema.invoices.createdAt, startDate),
      lte(schema.invoices.createdAt, endDate)
    ),
    with: {
      customer: true,
      items: true,
    },
  });

  // Tally Columns:
  // Voucher Date, Voucher Number, Party Name, Item Name, Qty, Rate, Amount, Tax Rate, Tax Amount, Line Total
  const headers = [
    "Voucher Date",
    "Voucher Number",
    "Party Name",
    "Item Name",
    "Qty",
    "Rate",
    "Amount",
    "Tax Rate",
    "Tax Amount",
    "Line Total"
  ];

  let csvContent = headers.join(",") + "\n";

  for (const invoice of rows) {
    if (invoice.status !== "PAID") continue; // only export paid invoices

    const vDate = new Date(invoice.createdAt).toLocaleDateString("en-GB"); // DD/MM/YYYY
    const vNumber = invoice.invoiceNo;
    const pName = `"${invoice.customer.name.replace(/"/g, '""')}"`;

    for (const item of invoice.items) {
      const iName = `"${item.description.replace(/"/g, '""')}"`;
      const qty = item.qty;
      const rate = Number(item.rate).toFixed(2);
      const amount = (item.qty * Number(item.rate)).toFixed(2);
      const taxRate = Number(item.taxRate).toFixed(2);
      
      const itemTaxAmount = (parseFloat(amount) * (parseFloat(taxRate) / 100)).toFixed(2);
      const lineTotal = Number(item.lineTotal).toFixed(2);

      const row = [
        vDate,
        vNumber,
        pName,
        iName,
        qty,
        rate,
        amount,
        `${taxRate}%`,
        itemTaxAmount,
        lineTotal
      ];

      csvContent += row.join(",") + "\n";
    }
  }

  return csvContent;
}
