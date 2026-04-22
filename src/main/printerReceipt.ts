// src/main/printerReceipt.ts
// Build and send an ESC/POS receipt to a configured thermal printer.
//
// Receipts use ASCII-safe text (no rupee glyph) because most thermal printers
// default to a Windows-1252 / PC437 code page. The full PDF remains the
// source-of-truth invoice document; the thermal slip is a compact summary
// for the customer.

import {
  ThermalPrinter,
  PrinterTypes,
  CharacterSet,
} from "node-thermal-printer";

export interface PrinterConfig {
  interface: string;
  type: string;
  printUpiQr: boolean;
}

type Item = {
  description: string;
  qty: number;
  rate: number;
  lineTotal: number;
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
  customerNotes?: string | null;
  customer: { name?: string | null; mobile?: string | null } | null;
  items: Item[];
};

type CenterProfile = {
  centerName?: string | null;
  address?: string | null;
  mobile?: string | null;
  upiId?: string | null;
} | null;

function resolveType(raw: string): PrinterTypes {
  const v = raw.toUpperCase();
  switch (v) {
    case "STAR":
      return PrinterTypes.STAR;
    case "TANCA":
      return PrinterTypes.TANCA;
    case "DARUMA":
      return PrinterTypes.DARUMA;
    case "BROTHER":
      return PrinterTypes.BROTHER;
    case "CUSTOM":
      return PrinterTypes.CUSTOM;
    case "EPSON":
    default:
      return PrinterTypes.EPSON;
  }
}

function ascii(input: string | null | undefined): string {
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
  return `Rs.${n.toFixed(2)}`;
}

function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function build(config: PrinterConfig): ThermalPrinter {
  return new ThermalPrinter({
    type: resolveType(config.type),
    interface: config.interface,
    characterSet: CharacterSet.PC437_USA,
    removeSpecialCharacters: false,
    width: 48,
    options: { timeout: 5000 },
  });
}

export async function printTestPage(config: PrinterConfig): Promise<void> {
  const printer = build(config);
  const connected = await printer.isPrinterConnected();
  if (!connected) {
    throw new Error(
      `Printer not reachable at ${config.interface} (type ${config.type})`
    );
  }
  printer.alignCenter();
  printer.bold(true);
  printer.println("CSC BILLING");
  printer.bold(false);
  printer.println("Printer Test Page");
  printer.drawLine();
  printer.alignLeft();
  printer.println(`Interface : ${config.interface}`);
  printer.println(`Type      : ${config.type.toUpperCase()}`);
  printer.println(`Timestamp : ${formatDateShort(new Date())}`);
  printer.drawLine();
  printer.alignCenter();
  printer.println("If you can read this,");
  printer.println("printing is working.");
  printer.newLine();
  printer.cut();
  await printer.execute();
}

export async function printReceipt(
  config: PrinterConfig,
  invoice: Invoice,
  center: CenterProfile
): Promise<void> {
  const printer = build(config);
  const connected = await printer.isPrinterConnected();
  if (!connected) {
    throw new Error(
      `Printer not reachable at ${config.interface} (type ${config.type})`
    );
  }

  // Header
  printer.alignCenter();
  printer.bold(true);
  printer.setTextDoubleHeight();
  printer.println(ascii(center?.centerName) || "CSC Center");
  printer.setTextNormal();
  printer.bold(false);
  if (center?.address) printer.println(ascii(center.address));
  if (center?.mobile) printer.println(`Ph: ${ascii(center.mobile)}`);
  printer.drawLine();

  // Meta
  printer.alignLeft();
  printer.leftRight(
    `Invoice: ${ascii(invoice.invoiceNo)}`,
    ascii(invoice.status)
  );
  printer.leftRight(
    `Date: ${formatDateShort(invoice.createdAt)}`,
    `Pay: ${ascii(invoice.paymentMode)}`
  );
  if (invoice.customer?.name) {
    printer.println(`Customer: ${ascii(invoice.customer.name)}`);
  }
  if (invoice.customer?.mobile) {
    printer.println(`Mobile: ${ascii(invoice.customer.mobile)}`);
  }
  printer.drawLine();

  // Items: description line, then qty x rate / total on second line.
  for (const item of invoice.items) {
    const desc = (ascii(item.description) || "Service").slice(0, 48);
    printer.println(desc);
    printer.leftRight(
      `  ${item.qty} x ${money(item.rate)}`,
      money(item.lineTotal)
    );
  }
  printer.drawLine();

  // Totals
  printer.leftRight("Subtotal", money(invoice.subtotal));
  printer.leftRight("Tax", money(invoice.taxTotal));
  if (invoice.discount > 0) {
    printer.leftRight("Discount", `-${money(invoice.discount)}`);
  }
  printer.bold(true);
  printer.setTextDoubleHeight();
  printer.leftRight("TOTAL", money(invoice.total));
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  // UPI block
  if (config.printUpiQr && center?.upiId) {
    printer.alignCenter();
    printer.println(`Pay via UPI: ${ascii(center.upiId)}`);
    const upiLink = `upi://pay?pa=${encodeURIComponent(center.upiId)}&pn=${encodeURIComponent(ascii(center.centerName) || "CSC")}&am=${invoice.total.toFixed(2)}&cu=INR`;
    printer.printQR(upiLink, { cellSize: 6, correction: "M" });
    printer.newLine();
  }

  // Footer
  printer.alignCenter();
  if (invoice.customerNotes) {
    printer.println(ascii(invoice.customerNotes).slice(0, 96));
  }
  printer.println("Thank you for your business!");
  printer.newLine();
  printer.cut();

  await printer.execute();
}
