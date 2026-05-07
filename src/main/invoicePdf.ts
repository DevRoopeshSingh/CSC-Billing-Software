// src/main/invoicePdf.ts
// Renders an invoice into a single-page A4 PDF with pdf-lib.
// No external fonts required — uses Helvetica (WinAnsi). The rupee symbol is
// not in WinAnsi, so amounts are prefixed with "Rs." instead of "₹".
//
// Layout policy:
//   ┌─────────────────────────────────────────────────────────────────┐
//   │ [logo] Center Name           INVOICE                            │
//   │        address / mobile      Invoice # / Date / Status / ...    │
//   │ ────────────────────────────────────────────────────────────    │
//   │ BILL TO                                                         │
//   │ customer name + contact                                         │
//   │                                                                 │
//   │ ┌─ items table ────────────────────────────────────────────┐    │
//   │ │ description | qty | rate | tax% | amount                  │    │
//   │ └───────────────────────────────────────────────────────────┘    │
//   │                                                Totals block      │
//   │                                                                  │
//   │ NOTES (optional)                                                 │
//   │ ────────────────────────────────────────────────────────────     │
//   │ Pay via UPI: id      [QR]                       Generated date   │
//   └──────────────────────────────────────────────────────────────────┘
//
// All vertical advance is computed from a single `y` cursor; reserved
// floors prevent items, totals, notes, and footer from ever overlapping.

import { PDFDocument, StandardFonts, PDFFont, PDFImage, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

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
  // Resolved absolute paths (or null) — main process resolves these inside
  // its uploadsPath sandbox before calling us, so we never touch the DB
  // strings directly.
  logoFile?: string | null;
  upiQrFile?: string | null;
} | null;

// Single-line sanitizer: strips newlines and any non-WinAnsi glyphs.
function sanitize(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/₹/g, "Rs.")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, "-")
    .replace(/•/g, "*")
    .replace(/\r\n?/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeMultiline(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((ln) => sanitize(ln))
    .filter((ln) => ln.length > 0);
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

function clipToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number
): string {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  const ell = "...";
  const ellW = font.widthOfTextAtSize(ell, size);
  let s = text;
  while (s.length > 1 && font.widthOfTextAtSize(s, size) + ellW > maxW) {
    s = s.slice(0, -1);
  }
  return s + ell;
}

function wrapToLines(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxW) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = font.widthOfTextAtSize(w, size) <= maxW
        ? w
        : clipToWidth(w, font, size, maxW);
      if (lines.length >= maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (
    lines.length === maxLines &&
    words.length > lines.join(" ").split(" ").length
  ) {
    lines[maxLines - 1] =
      clipToWidth(
        lines[maxLines - 1],
        font,
        size,
        maxW - font.widthOfTextAtSize("...", size)
      ).replace(/\.{3}$/, "") + "...";
  }
  return lines;
}

// Embed a PNG/JPG from disk, swallowing failures so a broken image never
// breaks invoice generation. Returns null if the file is missing/unreadable
// or in an unsupported format.
async function tryEmbedImage(
  doc: PDFDocument,
  filePath: string | null | undefined
): Promise<PDFImage | null> {
  if (!filePath) return null;
  try {
    if (!fs.existsSync(filePath)) return null;
    const bytes = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return await doc.embedPng(bytes);
    if (ext === ".jpg" || ext === ".jpeg") return await doc.embedJpg(bytes);
    return null;
  } catch (err) {
    console.error("[invoicePdf] failed to embed image", filePath, err);
    return null;
  }
}

// Scale an image to fit inside a (maxW × maxH) box while preserving aspect.
function fitImage(
  img: PDFImage,
  maxW: number,
  maxH: number
): { width: number; height: number } {
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  return { width: img.width * scale, height: img.height * scale };
}

export async function generateInvoicePdf(
  invoice: Invoice,
  center: CenterProfile,
  outPath: string
): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const marginX = 48;
  const marginY = 56;
  const ink = rgb(0.12, 0.14, 0.18);
  const mute = rgb(0.45, 0.48, 0.55);
  const line = rgb(0.85, 0.87, 0.9);
  const stripe = rgb(0.96, 0.97, 0.98);

  const logoImg = await tryEmbedImage(doc, center?.logoFile);
  const upiQrImg = await tryEmbedImage(doc, center?.upiQrFile);

  // ── Header ──────────────────────────────────────────────────────────────
  // Two columns: left holds [logo] + center identity, right holds INVOICE
  // label + meta block. Both columns share a fixed top edge so they always
  // baseline-align.
  const headerTop = height - marginY;
  const LOGO_BOX = 56; // square box reserved for the logo
  const logoSize = logoImg ? fitImage(logoImg, LOGO_BOX, LOGO_BOX) : null;
  const logoW = logoSize?.width ?? 0;
  const logoGap = logoImg ? 14 : 0;

  if (logoImg && logoSize) {
    page.drawImage(logoImg, {
      x: marginX,
      y: headerTop - logoSize.height,
      width: logoSize.width,
      height: logoSize.height,
    });
  }

  // INVOICE label sits at the top-right and is always drawn at the same size
  // so the right column has a predictable visual anchor.
  const invoiceLabel = "INVOICE";
  const invoiceLabelSize = 22;
  const invoiceLabelW = bold.widthOfTextAtSize(invoiceLabel, invoiceLabelSize);

  const centerName = sanitize(center?.centerName) || "CSC Center";
  const leftTextX = marginX + logoW + logoGap;
  const centerNameMaxW =
    width - marginX * 2 - invoiceLabelW - 24 - (logoW + logoGap);
  let centerNameSize = 18;
  while (
    centerNameSize > 11 &&
    bold.widthOfTextAtSize(centerName, centerNameSize) > centerNameMaxW
  ) {
    centerNameSize -= 1;
  }
  const centerNameDrawn =
    bold.widthOfTextAtSize(centerName, centerNameSize) > centerNameMaxW
      ? clipToWidth(centerName, bold, centerNameSize, centerNameMaxW)
      : centerName;

  // Top-line baseline: place center name so its visual top aligns with the
  // logo top. pdf-lib draws text from the baseline, so subtract size.
  const nameBaseline = headerTop - centerNameSize;
  page.drawText(centerNameDrawn, {
    x: leftTextX,
    y: nameBaseline,
    size: centerNameSize,
    font: bold,
    color: ink,
  });
  page.drawText(invoiceLabel, {
    x: width - marginX - invoiceLabelW,
    y: headerTop - invoiceLabelSize,
    size: invoiceLabelSize,
    font: bold,
    color: ink,
  });

  // Address block under the center name (left column).
  let leftY = nameBaseline - 14;
  const addrLines = [
    sanitize(center?.address),
    [sanitize(center?.mobile), sanitize(center?.email)]
      .filter(Boolean)
      .join("  ·  "),
    center?.udyamNumber ? `Udyam: ${sanitize(center.udyamNumber)}` : "",
  ].filter(Boolean);
  for (const ln of addrLines) {
    page.drawText(clipToWidth(ln, font, 9, centerNameMaxW), {
      x: leftTextX,
      y: leftY,
      size: 9,
      font,
      color: mute,
    });
    leftY -= 12;
  }

  // Meta block (right column, right-aligned). Sits below the INVOICE label.
  const metaRows: Array<[string, string]> = [
    ["Invoice #", sanitize(invoice.invoiceNo)],
    ["Date", formatDateShort(invoice.createdAt)],
    ["Status", sanitize(invoice.status)],
    ["Payment", sanitize(invoice.paymentMode)],
  ];
  let metaY = headerTop - invoiceLabelSize - 14;
  for (const [k, v] of metaRows) {
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
    metaY -= 12;
  }

  // The cursor drops to the lower of the two columns plus the logo bottom.
  const logoBottom = logoImg && logoSize ? headerTop - logoSize.height : headerTop;
  let y = Math.min(leftY, metaY, logoBottom) - 10;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 0.8,
    color: line,
  });
  y -= 18;

  // ── Bill To ─────────────────────────────────────────────────────────────
  page.drawText("BILL TO", {
    x: marginX,
    y,
    size: 8,
    font: bold,
    color: mute,
  });
  y -= 14;
  const billToMaxW = width - marginX * 2;
  page.drawText(
    clipToWidth(
      sanitize(invoice.customer?.name) || "-",
      bold,
      11,
      billToMaxW
    ),
    { x: marginX, y, size: 11, font: bold, color: ink }
  );
  for (const ln of [
    sanitize(invoice.customer?.mobile),
    sanitize(invoice.customer?.email),
    sanitize(invoice.customer?.address),
  ]) {
    if (!ln) continue;
    y -= 12;
    page.drawText(clipToWidth(ln, font, 9, billToMaxW), {
      x: marginX,
      y,
      size: 9,
      font,
      color: mute,
    });
  }

  y -= 22;

  // ── Items table ─────────────────────────────────────────────────────────
  const COL = {
    descX: marginX,
    descMaxW: 240,
    qtyRight: marginX + 300,
    rateRight: marginX + 384,
    taxRight: marginX + 444,
    totalRight: width - marginX,
  };

  // Header band
  page.drawRectangle({
    x: marginX - 6,
    y: y - 6,
    width: width - marginX * 2 + 12,
    height: 18,
    color: stripe,
  });
  const headerSize = 8;
  const drawHeaderRight = (text: string, rightX: number) => {
    const w = bold.widthOfTextAtSize(text, headerSize);
    page.drawText(text, {
      x: rightX - w,
      y,
      size: headerSize,
      font: bold,
      color: mute,
    });
  };
  page.drawText("DESCRIPTION", {
    x: COL.descX,
    y,
    size: headerSize,
    font: bold,
    color: mute,
  });
  drawHeaderRight("QTY", COL.qtyRight);
  drawHeaderRight("RATE", COL.rateRight);
  drawHeaderRight("TAX%", COL.taxRight);
  drawHeaderRight("AMOUNT", COL.totalRight);
  y -= 18;

  // Reserve vertical room for the footer (UPI block + divider) plus totals
  // and notes. Items truncate before they encroach.
  const FOOTER_BAND_H = upiQrImg ? 96 : 36;
  const FOOTER_FLOOR = marginY + FOOTER_BAND_H + 90;

  for (const item of invoice.items) {
    if (y < FOOTER_FLOOR + 22) {
      page.drawText("... more items truncated ...", {
        x: COL.descX,
        y,
        size: 9,
        font,
        color: mute,
      });
      y -= 14;
      break;
    }

    const rawDesc =
      sanitize(item.description) ||
      sanitize(item.service?.name) ||
      "Service";
    const descLines = wrapToLines(rawDesc, font, 10, COL.descMaxW, 2);
    const rowH = Math.max(16, descLines.length * 12 + 4);

    const drawRowRight = (text: string, rightX: number) => {
      const w = font.widthOfTextAtSize(text, 10);
      page.drawText(text, {
        x: rightX - w,
        y,
        size: 10,
        font,
        color: ink,
      });
    };

    let descY = y;
    for (const ln of descLines) {
      page.drawText(ln, {
        x: COL.descX,
        y: descY,
        size: 10,
        font,
        color: ink,
      });
      descY -= 12;
    }

    drawRowRight(String(item.qty), COL.qtyRight);
    drawRowRight(money(item.rate), COL.rateRight);
    drawRowRight(`${item.taxRate.toFixed(2)}%`, COL.taxRight);
    drawRowRight(money(item.lineTotal), COL.totalRight);

    y -= rowH;
    page.drawLine({
      start: { x: marginX, y: y + 4 },
      end: { x: width - marginX, y: y + 4 },
      thickness: 0.3,
      color: line,
    });
    y -= 4;
  }

  y -= 10;

  // ── Totals (right-aligned) ─────────────────────────────────────────────
  const totalsRight = width - marginX;
  const totalsLabelGap = 18;
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
      x: totalsRight - valueW - totalsLabelGap - labelW,
      y,
      size,
      font: f,
      color: emphasize ? ink : mute,
    });
    page.drawText(value, {
      x: totalsRight - valueW,
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
  page.drawLine({
    start: { x: totalsRight - 220, y: y + 4 },
    end: { x: totalsRight, y: y + 4 },
    thickness: 0.8,
    color: line,
  });
  y -= 4;
  drawTotalsRow("Total", money(invoice.total), true);

  // ── Notes ───────────────────────────────────────────────────────────────
  const NOTES_TOP = y - 10;
  const FOOTER_TOP_Y = marginY + FOOTER_BAND_H;
  const notesAvailH = NOTES_TOP - FOOTER_TOP_Y - 6;
  const noteParas = sanitizeMultiline(invoice.customerNotes);
  if (noteParas.length > 0 && notesAvailH >= 24) {
    y = NOTES_TOP;
    page.drawText("NOTES", {
      x: marginX,
      y,
      size: 8,
      font: bold,
      color: mute,
    });
    y -= 12;
    const notesMaxLines = Math.max(1, Math.floor((notesAvailH - 12) / 12));
    const notesMaxW = width - marginX * 2;
    let lineCount = 0;
    outer: for (const para of noteParas) {
      const wrapped = wrapToLines(
        para,
        font,
        9,
        notesMaxW,
        notesMaxLines - lineCount
      );
      for (const ln of wrapped) {
        if (lineCount >= notesMaxLines) break outer;
        page.drawText(ln, { x: marginX, y, size: 9, font, color: ink });
        y -= 12;
        lineCount += 1;
      }
    }
  }

  // ── Footer (UPI + QR + generated stamp) ─────────────────────────────────
  const footerDividerY = marginY + FOOTER_BAND_H - 4;
  page.drawLine({
    start: { x: marginX, y: footerDividerY },
    end: { x: width - marginX, y: footerDividerY },
    thickness: 0.5,
    color: line,
  });

  const upiId = sanitize(center?.upiId);
  const footerBaseY = marginY - 6;

  // QR (right-aligned, sits above the generated stamp). Bottom edge of the
  // QR aligns with `footerBaseY + ~36` so it never overlaps the right-side
  // text below it.
  let qrLeftEdge = width - marginX;
  if (upiQrImg) {
    const qrSize = fitImage(upiQrImg, 64, 64);
    const qrX = width - marginX - qrSize.width;
    const qrY = footerDividerY - qrSize.height - 6;
    page.drawImage(upiQrImg, {
      x: qrX,
      y: qrY,
      width: qrSize.width,
      height: qrSize.height,
    });
    qrLeftEdge = qrX - 8;
    // "Scan to pay" caption under the QR.
    const cap = "Scan to pay";
    const capW = font.widthOfTextAtSize(cap, 8);
    page.drawText(cap, {
      x: qrX + (qrSize.width - capW) / 2,
      y: qrY - 10,
      size: 8,
      font,
      color: mute,
    });
  }

  // Left side of the footer: UPI ID (or thank-you fallback).
  const footerLeftMaxW = qrLeftEdge - marginX - 8;
  const footerLeft = upiId
    ? `Pay via UPI: ${upiId}`
    : "Thank you for your business";
  page.drawText(clipToWidth(footerLeft, font, 9, Math.max(80, footerLeftMaxW)), {
    x: marginX,
    y: footerDividerY - 16,
    size: 9,
    font: upiId ? bold : font,
    color: upiId ? ink : mute,
  });

  // "Generated …" stamp at the bottom-left.
  const genText = `Generated ${formatDateShort(new Date())}`;
  page.drawText(genText, {
    x: marginX,
    y: footerBaseY,
    size: 8,
    font,
    color: mute,
  });

  const bytes = await doc.save();
  fs.writeFileSync(outPath, bytes);
}
