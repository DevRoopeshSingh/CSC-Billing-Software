// src/main/invoicePdf.ts
// Renders an invoice into a single-page A4 PDF with pdf-lib.
// No external fonts required — uses Helvetica (WinAnsi). The rupee symbol is
// not in WinAnsi, so amounts are prefixed with "Rs." instead of "₹".

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";

type Customer = {
  name?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
};

type Service = { name?: string | null };

type Item = {
  description: string;
  qty: number;
  rate: number;
  taxRate: number;
  lineTotal: number;
  service?: Service | null;
};

type Invoice = {
  invoiceNo: string;
  createdAt?: Date | string | null;
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paymentMode: string;
  status: string;
  notes?: string | null;
  customerNotes?: string | null;
  customer: Customer | null;
  items: Item[];
};

type CenterProfile = {
  centerName?: string | null;
  address?: string | null;
  mobile?: string | null;
  email?: string | null;
  udyamNumber?: string | null;
  upiId?: string | null;
  invoicePrefix?: string | null;
  logoPath?: string | null;
} | null;

// Sanitize strings for WinAnsi encoding — replace rupee and common unicode
// glyphs with ASCII fallbacks so pdf-lib's Helvetica can render them.
function sanitize(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/₹/g, "Rs.")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, "-")
    .replace(/•/g, "*")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function money(n: number): string {
  return `Rs. ${n.toFixed(2)}`;
}

function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function generateInvoicePdf(
  invoice: Invoice,
  center: CenterProfile,
  outPath: string
): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 portrait: 595 x 842 points.
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const marginX = 48;
  const marginY = 56;
  const ink = rgb(0.12, 0.14, 0.18);
  const mute = rgb(0.45, 0.48, 0.55);
  const line = rgb(0.85, 0.87, 0.9);

  let y = height - marginY;

  // ── Header: center name + invoice label ────────────────────────────────
  const centerName = sanitize(center?.centerName) || "CSC Center";
  page.drawText(centerName, {
    x: marginX,
    y,
    size: 20,
    font: bold,
    color: ink,
  });
  const invoiceLabel = "INVOICE";
  const labelWidth = bold.widthOfTextAtSize(invoiceLabel, 20);
  page.drawText(invoiceLabel, {
    x: width - marginX - labelWidth,
    y,
    size: 20,
    font: bold,
    color: ink,
  });
  y -= 20;

  const addrLines = [
    sanitize(center?.address),
    [sanitize(center?.mobile), sanitize(center?.email)]
      .filter(Boolean)
      .join("  ·  "),
    center?.udyamNumber ? `Udyam: ${sanitize(center.udyamNumber)}` : "",
  ].filter(Boolean);
  for (const ln of addrLines) {
    y -= 12;
    page.drawText(ln, { x: marginX, y, size: 9, font, color: mute });
  }

  // Invoice meta block (right-aligned)
  const metaRows = [
    ["Invoice #", sanitize(invoice.invoiceNo)],
    ["Date", formatDateShort(invoice.createdAt)],
    ["Status", sanitize(invoice.status)],
    ["Payment", sanitize(invoice.paymentMode)],
  ];
  let metaY = height - marginY - 20;
  for (const [k, v] of metaRows) {
    metaY -= 12;
    const kText = `${k}:`;
    const kW = font.widthOfTextAtSize(kText, 9);
    const vW = bold.widthOfTextAtSize(v, 9);
    page.drawText(kText, {
      x: width - marginX - vW - 8 - kW,
      y: metaY,
      size: 9,
      font,
      color: mute,
    });
    page.drawText(v, {
      x: width - marginX - vW,
      y: metaY,
      size: 9,
      font: bold,
      color: ink,
    });
  }

  y = Math.min(y, metaY) - 18;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 0.8,
    color: line,
  });
  y -= 22;

  // ── Bill To ─────────────────────────────────────────────────────────────
  page.drawText("BILL TO", {
    x: marginX,
    y,
    size: 8,
    font: bold,
    color: mute,
  });
  y -= 14;
  page.drawText(sanitize(invoice.customer?.name) || "-", {
    x: marginX,
    y,
    size: 11,
    font: bold,
    color: ink,
  });
  for (const ln of [
    sanitize(invoice.customer?.mobile),
    sanitize(invoice.customer?.email),
    sanitize(invoice.customer?.address),
  ]) {
    if (!ln) continue;
    y -= 12;
    page.drawText(ln, { x: marginX, y, size: 9, font, color: mute });
  }

  y -= 24;

  // ── Items table ─────────────────────────────────────────────────────────
  const colX = {
    desc: marginX,
    qty: marginX + 320,
    rate: marginX + 360,
    tax: marginX + 420,
    total: width - marginX,
  };
  page.drawRectangle({
    x: marginX - 6,
    y: y - 6,
    width: width - marginX * 2 + 12,
    height: 20,
    color: rgb(0.96, 0.97, 0.98),
  });
  page.drawText("DESCRIPTION", {
    x: colX.desc,
    y,
    size: 8,
    font: bold,
    color: mute,
  });
  const drawRight = (text: string, rightX: number, size = 8, f = bold) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: rightX - w, y, size, font: f, color: mute });
  };
  drawRight("QTY", colX.qty + 28, 8);
  drawRight("RATE", colX.rate + 48, 8);
  drawRight("TAX%", colX.tax + 48, 8);
  drawRight("AMOUNT", colX.total, 8);
  y -= 22;

  for (const item of invoice.items) {
    if (y < marginY + 180) {
      // Overflow: stop rendering further items rather than spilling onto a
      // second page. Billing-center invoices rarely exceed one page; we can
      // revisit with pagination if this becomes a real limit.
      page.drawText("... more items truncated ...", {
        x: marginX,
        y,
        size: 9,
        font,
        color: mute,
      });
      y -= 14;
      break;
    }
    const desc =
      sanitize(item.description) ||
      sanitize(item.service?.name) ||
      "Service";
    page.drawText(desc.slice(0, 60), {
      x: colX.desc,
      y,
      size: 10,
      font,
      color: ink,
    });
    const drawRightInk = (text: string, rightX: number) => {
      const w = font.widthOfTextAtSize(text, 10);
      page.drawText(text, { x: rightX - w, y, size: 10, font, color: ink });
    };
    drawRightInk(String(item.qty), colX.qty + 28);
    drawRightInk(money(item.rate), colX.rate + 48);
    drawRightInk(`${item.taxRate.toFixed(2)}%`, colX.tax + 48);
    drawRightInk(money(item.lineTotal), colX.total);
    y -= 16;
    page.drawLine({
      start: { x: marginX, y: y + 4 },
      end: { x: width - marginX, y: y + 4 },
      thickness: 0.3,
      color: line,
    });
    y -= 2;
  }

  y -= 14;

  // ── Totals block (right) ────────────────────────────────────────────────
  const totalsX = width - marginX;
  const drawTotalsRow = (
    label: string,
    value: string,
    emphasize = false
  ) => {
    const size = emphasize ? 12 : 10;
    const f = emphasize ? bold : font;
    const labelW = f.widthOfTextAtSize(label, size);
    const valueW = f.widthOfTextAtSize(value, size);
    page.drawText(label, {
      x: totalsX - valueW - 18 - labelW,
      y,
      size,
      font: f,
      color: emphasize ? ink : mute,
    });
    page.drawText(value, {
      x: totalsX - valueW,
      y,
      size,
      font: f,
      color: ink,
    });
    y -= emphasize ? 18 : 14;
  };

  drawTotalsRow("Subtotal", money(invoice.subtotal));
  drawTotalsRow("Tax", money(invoice.taxTotal));
  if (invoice.discount > 0) {
    drawTotalsRow("Discount", `- ${money(invoice.discount)}`);
  }
  y -= 4;
  page.drawLine({
    start: { x: totalsX - 220, y: y + 10 },
    end: { x: totalsX, y: y + 10 },
    thickness: 0.8,
    color: line,
  });
  drawTotalsRow("Total", money(invoice.total), true);

  // ── Notes ───────────────────────────────────────────────────────────────
  const customerNotes = sanitize(invoice.customerNotes);
  if (customerNotes) {
    y -= 10;
    page.drawText("NOTES", {
      x: marginX,
      y,
      size: 8,
      font: bold,
      color: mute,
    });
    y -= 12;
    for (const ln of customerNotes.split("\n").slice(0, 6)) {
      page.drawText(ln.slice(0, 90), {
        x: marginX,
        y,
        size: 9,
        font,
        color: ink,
      });
      y -= 12;
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const upiId = sanitize(center?.upiId);
  const footerY = marginY - 12;
  page.drawLine({
    start: { x: marginX, y: footerY + 20 },
    end: { x: width - marginX, y: footerY + 20 },
    thickness: 0.5,
    color: line,
  });
  const footerLeft = upiId
    ? `Pay via UPI: ${upiId}`
    : "Thank you for your business";
  page.drawText(footerLeft, {
    x: marginX,
    y: footerY,
    size: 9,
    font,
    color: mute,
  });
  const genText = `Generated ${formatDateShort(new Date())}`;
  const genW = font.widthOfTextAtSize(genText, 9);
  page.drawText(genText, {
    x: width - marginX - genW,
    y: footerY,
    size: 9,
    font,
    color: mute,
  });

  const bytes = await doc.save();
  fs.writeFileSync(outPath, bytes);
}
