// src/app/settings/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ipc, IpcError } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import type { CenterProfile } from "@/shared/types";
import {
  Building2,
  Receipt,
  Wallet,
  Clock,
  Save,
  Loader2,
  Info,
  Printer,
  PrinterIcon,
} from "lucide-react";

// ── Form state mirrors all editable fields from CenterProfile ────────────────
interface SettingsForm {
  centerName: string;
  address: string;
  mobile: string;
  email: string;
  udyamNumber: string;
  centerDescription: string;
  operatingHours: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  defaultPaymentMode: "Cash" | "UPI" | "Card" | "Other";
  upiId: string;
  printerInterface: string;
  printerType: string;
  printUpiQr: boolean;
}

const DEFAULT_FORM: SettingsForm = {
  centerName: "",
  address: "",
  mobile: "",
  email: "",
  udyamNumber: "",
  centerDescription: "",
  operatingHours: "",
  invoicePrefix: "INV-",
  defaultTaxRate: 0,
  defaultPaymentMode: "Cash",
  upiId: "",
  printerInterface: "tcp://192.168.1.100:9100",
  printerType: "EPSON",
  printUpiQr: false,
};

function profileToForm(p: CenterProfile): SettingsForm {
  return {
    centerName: p.centerName ?? "",
    address: p.address ?? "",
    mobile: p.mobile ?? "",
    email: p.email ?? "",
    udyamNumber: p.udyamNumber ?? "",
    centerDescription: p.centerDescription ?? "",
    operatingHours: p.operatingHours ?? "",
    invoicePrefix: p.invoicePrefix ?? "INV-",
    defaultTaxRate: p.defaultTaxRate ?? 0,
    defaultPaymentMode:
      (p.defaultPaymentMode as SettingsForm["defaultPaymentMode"]) ?? "Cash",
    upiId: p.upiId ?? "",
    printerInterface: p.printerInterface ?? "tcp://192.168.1.100:9100",
    printerType: p.printerType ?? "EPSON",
    printUpiQr: p.printUpiQr ?? false,
  };
}

// ── Shared input class ────────────────────────────────────────────────────────
const inputCls = cn(
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
  "placeholder:text-muted-foreground"
);

const textareaCls = cn(
  "w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
  "placeholder:text-muted-foreground"
);

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Label ─────────────────────────────────────────────────────────────────────
function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-foreground">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
      {hint && (
        <span className="ml-2 font-normal text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<number>(0);
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM);

  const [testingPrinter, setTestingPrinter] = useState(false);

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const loadProfile = useCallback(async () => {
    try {
      const profile = await ipc<CenterProfile>(IPC.CENTER_GET);
      if (profile) {
        setForm(profileToForm(profile));
        setInvoiceNumber(profile.invoiceNumber ?? 0);
      }
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to load settings",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate invoice prefix
    if (!form.invoicePrefix.trim()) {
      toast("Invoice prefix cannot be empty", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        centerName: form.centerName.trim(),
        address: form.address.trim(),
        mobile: form.mobile.trim(),
        // Always send a string for email — Zod validates email().or(literal(""))
        email: form.email.trim(),
        udyamNumber: form.udyamNumber.trim(),
        centerDescription: form.centerDescription.trim(),
        operatingHours: form.operatingHours.trim(),
        invoicePrefix: form.invoicePrefix.trim(),
        defaultTaxRate: Number(form.defaultTaxRate),
        defaultPaymentMode: form.defaultPaymentMode,
        upiId: form.upiId.trim() || null,
        printerInterface: form.printerInterface.trim(),
        printerType: form.printerType,
        printUpiQr: form.printUpiQr,
      };

      await ipc(IPC.CENTER_UPDATE, payload);
      toast("Settings saved successfully", "success");
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Failed to save settings",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    setTestingPrinter(true);
    try {
      await ipc(IPC.PRINTER_TEST, {
        interface: form.printerInterface,
        type: form.printerType,
        printUpiQr: form.printUpiQr,
      });
      toast("Test print sent successfully", "success");
    } catch (err) {
      toast(
        err instanceof IpcError ? err.message : "Test print failed",
        "error"
      );
    } finally {
      setTestingPrinter(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading settings…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These details appear on every invoice, receipt, and PDF you
            generate.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5",
            "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark",
            "disabled:opacity-60"
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      {/* ── Section 1: Center Information ─────────────────────────────── */}
      <SectionCard
        icon={Building2}
        title="Center Information"
        subtitle="Your business identity — appears in the PDF header and receipt"
      >
        <div className="space-y-4">
          <div>
            <FieldLabel required>Center Name</FieldLabel>
            <input
              type="text"
              value={form.centerName}
              onChange={(e) => set("centerName", e.target.value)}
              placeholder="e.g. Sharma Digital Services"
              className={inputCls}
            />
          </div>

          <div>
            <FieldLabel>Address</FieldLabel>
            <textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Shop No. 12, Main Market, New Delhi — 110001"
              rows={2}
              className={textareaCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Mobile / Phone</FieldLabel>
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                placeholder="9876543210"
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="center@example.com"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel hint="optional">Udyam Registration No.</FieldLabel>
              <input
                type="text"
                value={form.udyamNumber}
                onChange={(e) => set("udyamNumber", e.target.value)}
                placeholder="UDYAM-XX-00-0000000"
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel hint="optional">Operating Hours</FieldLabel>
              <input
                type="text"
                value={form.operatingHours}
                onChange={(e) => set("operatingHours", e.target.value)}
                placeholder="Mon–Sat, 9 AM – 7 PM"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <FieldLabel hint="optional">Center Description / Tagline</FieldLabel>
            <textarea
              value={form.centerDescription}
              onChange={(e) => set("centerDescription", e.target.value)}
              placeholder="Your one-stop digital services center"
              rows={2}
              className={textareaCls}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Section 2: Invoice Defaults ───────────────────────────────── */}
      <SectionCard
        icon={Receipt}
        title="Invoice Defaults"
        subtitle="Applied when creating every new invoice"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Invoice Prefix</FieldLabel>
              <input
                type="text"
                value={form.invoicePrefix}
                onChange={(e) => set("invoicePrefix", e.target.value)}
                placeholder="INV-"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                e.g. Prefix INV- → INV-20260424-001
              </p>
            </div>
            <div>
              <FieldLabel hint="auto-managed">Invoice Counter</FieldLabel>
              <div
                className={cn(
                  "flex h-[42px] items-center rounded-lg border border-border bg-background px-3",
                  "text-sm font-semibold text-muted-foreground"
                )}
              >
                {invoiceNumber}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Auto-increments on each new invoice
              </p>
            </div>
            <div>
              <FieldLabel>Default Tax Rate (%)</FieldLabel>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.defaultTaxRate}
                onChange={(e) =>
                  set("defaultTaxRate", parseFloat(e.target.value) || 0)
                }
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Pre-filled on every new service line
              </p>
            </div>
          </div>

          <div className="max-w-xs">
            <FieldLabel>Default Payment Mode</FieldLabel>
            <select
              value={form.defaultPaymentMode}
              onChange={(e) =>
                set(
                  "defaultPaymentMode",
                  e.target.value as SettingsForm["defaultPaymentMode"]
                )
              }
              className={inputCls}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Pre-selected on the new invoice form
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── Section 3: UPI & Payment ─────────────────────────────────── */}
      <SectionCard
        icon={Wallet}
        title="UPI & Payment"
        subtitle="Shown in the invoice PDF footer so customers can pay you directly"
      >
        <div className="max-w-md space-y-1">
          <FieldLabel hint="optional">UPI ID</FieldLabel>
          <input
            type="text"
            value={form.upiId}
            onChange={(e) => set("upiId", e.target.value)}
            placeholder="yourname@upi"
            className={inputCls}
          />
          <p className="pt-1 text-[11px] text-muted-foreground">
            Printed in the PDF footer as: "Pay via UPI: yourname@upi"
          </p>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Logo and UPI QR image upload will be available in the next update.
            For now, the UPI ID will appear as text on your invoices.
          </span>
        </div>
      </SectionCard>

      {/* ── Section 4: Printer & Receipts ─────────────────────────────── */}
      <SectionCard
        icon={Printer}
        title="Printer Settings"
        subtitle="Configure your thermal receipt printer"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel required hint="IP or USB">Printer Interface</FieldLabel>
              <input
                type="text"
                value={form.printerInterface}
                onChange={(e) => set("printerInterface", e.target.value)}
                placeholder="tcp://192.168.1.100:9100"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Network: tcp://[IP]:9100 or USB interface string
              </p>
            </div>
            <div>
              <FieldLabel required>Printer Type</FieldLabel>
              <select
                value={form.printerType}
                onChange={(e) => set("printerType", e.target.value)}
                className={inputCls}
              >
                <option value="EPSON">EPSON</option>
                <option value="STAR">STAR</option>
                <option value="BROTHER">BROTHER</option>
                <option value="CUSTOM">CUSTOM</option>
                <option value="TANCA">TANCA</option>
                <option value="DARUMA">DARUMA</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="printUpiQr"
              checked={form.printUpiQr}
              onChange={(e) => set("printUpiQr", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="printUpiQr" className="text-sm font-medium text-foreground">
              Print UPI QR Code on Receipts
            </label>
          </div>

          <div className="pt-2 border-t border-border mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Click test to verify printer connection with current unsaved settings.
            </p>
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={testingPrinter}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2",
                "text-[13px] font-medium text-foreground transition-colors hover:bg-background",
                "disabled:opacity-50"
              )}
            >
              {testingPrinter ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PrinterIcon className="h-4 w-4 text-muted-foreground" />
              )}
              {testingPrinter ? "Testing..." : "Test Print"}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── Section 5: Operating Schedule (cosmetic) ──────────────────── */}
      <SectionCard
        icon={Clock}
        title="Schedule & Notes"
        subtitle="Informational — not printed on invoices in this version"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel hint="optional">Operating Hours</FieldLabel>
            <input
              type="text"
              value={form.operatingHours}
              onChange={(e) => set("operatingHours", e.target.value)}
              placeholder="Mon–Sat, 9 AM – 7 PM"
              className={inputCls}
            />
          </div>
          <div>
            <FieldLabel hint="optional">Center Description / Tagline</FieldLabel>
            <input
              type="text"
              value={form.centerDescription}
              onChange={(e) => set("centerDescription", e.target.value)}
              placeholder="Your one-stop digital services center"
              className={inputCls}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Sticky save bar at bottom ─────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4",
          "shadow-sm"
        )}
      >
        <p className="text-xs text-muted-foreground">
          Changes take effect immediately on the next invoice you create.
        </p>
        <button
          type="submit"
          disabled={saving}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5",
            "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark",
            "disabled:opacity-60"
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
