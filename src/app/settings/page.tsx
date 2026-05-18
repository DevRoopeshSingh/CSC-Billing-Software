// src/app/settings/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ipc, IpcError, isBridgeAvailable } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { api, ApiError } from "@/lib/api-client";
import { API } from "@/lib/api-routes";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth-context";
import { useCanAdmin } from "@/lib/permissions";
import { PinPromptModal } from "@/components/auth/PinPromptModal";
import {
  ALLOWED_BRANDING_MIME,
  MAX_BRANDING_ASSET_BYTES,
  type BrandingAssetKind,
} from "@/shared/types";
import {
  Building2,
  Receipt,
  Wallet,
  Clock,
  Save,
  Loader2,
  Image as ImageIcon,
  QrCode,
  Trash2,
  Upload,
  Printer,
  PrinterIcon,
  Lock,
  Key,
} from "lucide-react";

// ── Wire shape coming back from GET /api/center ──────────────────────────────
interface CenterApi {
  id: number;
  centerName: string;
  address: string;
  mobile: string;
  email: string;
  udyamNumber: string;
  upiId: string | null;
  invoicePrefix: string;
  invoiceNumber: number;
  theme: string;
  defaultTaxRate: number;
  defaultPaymentMode: string;
  hasPin: boolean;
  operatingHours: string;
  centerDescription: string;
  printUpiQr: boolean;
}

// Printer subset still served by Electron/SQLite — not in the pg schema.
interface PrinterFromIpc {
  printerInterface?: string;
  printerType?: string;
}

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

function profileToForm(p: CenterApi, printer: PrinterFromIpc): SettingsForm {
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
    printerInterface: printer.printerInterface ?? "tcp://192.168.1.100:9100",
    printerType: printer.printerType ?? "EPSON",
    printUpiQr: p.printUpiQr ?? false,
  };
}

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

function BrandingUploader({
  title,
  description,
  icon: Icon,
  previewUrl,
  uploading,
  inputRef,
  onPick,
  onDelete,
  previewClassName,
  placeholder,
}: {
  kind: BrandingAssetKind;
  title: string;
  description: string;
  icon: React.ElementType;
  previewUrl: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (file: File | null) => void;
  onDelete: () => void;
  previewClassName: string;
  placeholder: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-card text-[11px] text-muted-foreground"
          )}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={title}
              className={previewClassName}
              onError={(e) => {
                // 404 from the asset endpoint means nothing has been uploaded.
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="px-2 text-center">{placeholder}</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-xs text-muted-foreground">{description}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_BRANDING_MIME.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onPick(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5",
                "text-xs font-medium text-foreground transition-colors hover:bg-background",
                "disabled:opacity-60"
              )}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {previewUrl ? "Replace" : "Upload"}
            </button>
            {previewUrl && (
              <button
                type="button"
                onClick={onDelete}
                disabled={uploading}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5",
                  "text-xs font-medium text-red-700 transition-colors hover:bg-red-100",
                  "disabled:opacity-60"
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<number>(0);
  const [hasPin, setHasPin] = useState(false);
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM);
  // Cache-bust counter per kind. We bump it on upload/delete so the <img>
  // element refetches instead of serving the 60-second-cached old asset.
  const [assetVersion, setAssetVersion] = useState({ logo: 0, upiQr: 0 });
  const [hasAsset, setHasAsset] = useState({ logo: false, upiQr: false });
  const [uploading, setUploading] = useState<BrandingAssetKind | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    kind: BrandingAssetKind;
    file: File;
  } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // PIN change card state
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "" });
  const [savingPin, setSavingPin] = useState(false);

  const [testingPrinter, setTestingPrinter] = useState(false);
  const [hasBridge, setHasBridge] = useState<boolean | null>(null);
  const isAdmin = useCanAdmin();

  useEffect(() => {
    setHasBridge(isBridgeAvailable());
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      router.replace("/");
    }
  }, [user, isAdmin, router]);

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Probe each asset by HEAD so the uploader shows "Replace" vs "Upload"
  // accurately on first load. Errors fall through to "no asset present".
  const probeAsset = useCallback(
    async (kind: BrandingAssetKind): Promise<boolean> => {
      try {
        const res = await fetch(API.CENTER_BRANDING_ASSET(kind), {
          method: "HEAD",
          credentials: "same-origin",
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    []
  );

  const loadProfile = useCallback(async () => {
    try {
      // Web fields come from /api/center. Printer fields still live in
      // SQLite (Electron-only); silently skip if IPC isn't available
      // (plain browser / dev server without preload).
      const [profile, printerIpc, logoPresent, qrPresent] = await Promise.all([
        api.get<CenterApi | null>(API.CENTER),
        ipc<{ printerInterface?: string; printerType?: string }>(IPC.CENTER_GET)
          .then((p) => ({
            printerInterface: p?.printerInterface,
            printerType: p?.printerType,
          }))
          .catch(() => ({})),
        probeAsset("logo"),
        probeAsset("upiQr"),
      ]);
      if (profile) {
        setForm(profileToForm(profile, printerIpc));
        setInvoiceNumber(profile.invoiceNumber ?? 0);
        setHasPin(profile.hasPin);
      }
      setHasAsset({ logo: logoPresent, upiQr: qrPresent });
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Failed to load settings",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [toast, probeAsset]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Branding flow ──────────────────────────────────────────────────────────
  // Pick a file → client-side validate → stash + show PIN modal. The PIN is
  // sent with the multipart POST so the upload itself is what gets PIN-
  // verified (no separate verify-then-act race).
  const handleBrandingFile = (
    kind: BrandingAssetKind,
    file: File | null
  ) => {
    if (!file) return;
    if (
      !ALLOWED_BRANDING_MIME.includes(
        file.type as (typeof ALLOWED_BRANDING_MIME)[number]
      )
    ) {
      toast("Use a PNG or JPEG image.", "error");
      return;
    }
    if (file.size > MAX_BRANDING_ASSET_BYTES) {
      toast(
        `Image is too large (max ${Math.round(
          MAX_BRANDING_ASSET_BYTES / 1024 / 1024
        )} MB).`,
        "error"
      );
      return;
    }
    setPendingUpload({ kind, file });
  };

  const confirmUpload = async (pin: string) => {
    if (!pendingUpload) return;
    const { kind, file } = pendingUpload;
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      await api.post(API.CENTER_BRANDING, fd, {
        headers: { "x-admin-pin": pin },
      });
      setAssetVersion((v) => ({ ...v, [kind]: v[kind] + 1 }));
      setHasAsset((h) => ({ ...h, [kind]: true }));
      toast(`${kind === "logo" ? "Logo" : "UPI QR"} updated`, "success");
      setPendingUpload(null);
    } catch (err) {
      throw err instanceof ApiError
        ? err
        : new Error(
            `Failed to upload ${kind === "logo" ? "logo" : "UPI QR"}`
          );
    } finally {
      setUploading(null);
    }
  };

  const handleBrandingDelete = async (kind: BrandingAssetKind) => {
    setUploading(kind);
    try {
      await api.delete(API.CENTER_BRANDING_ASSET(kind));
      setHasAsset((h) => ({ ...h, [kind]: false }));
      setAssetVersion((v) => ({ ...v, [kind]: v[kind] + 1 }));
      toast(`${kind === "logo" ? "Logo" : "UPI QR"} removed`, "success");
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.message
          : `Failed to remove ${kind === "logo" ? "logo" : "UPI QR"}`,
        "error"
      );
    } finally {
      setUploading(null);
    }
  };

  // ── Save settings ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoicePrefix.trim()) {
      toast("Invoice prefix cannot be empty", "error");
      return;
    }
    setSaving(true);
    try {
      // Web-side fields → Postgres via PATCH /api/center.
      const webPayload = {
        centerName: form.centerName.trim(),
        address: form.address.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        udyamNumber: form.udyamNumber.trim(),
        centerDescription: form.centerDescription.trim(),
        operatingHours: form.operatingHours.trim(),
        invoicePrefix: form.invoicePrefix.trim(),
        defaultTaxRate: Number(form.defaultTaxRate),
        defaultPaymentMode: form.defaultPaymentMode,
        upiId: form.upiId.trim() || null,
        printUpiQr: form.printUpiQr,
      };
      await api.patch(API.CENTER, webPayload);

      // Printer-only fields still live in SQLite (the thermal-print path
      // hasn't migrated yet). In a plain browser this throws — swallow it,
      // there's no printer to configure anyway.
      if (hasBridge) {
        await ipc(IPC.CENTER_UPDATE, {
          printerInterface: form.printerInterface.trim(),
          printerType: form.printerType,
        }).catch(() => {
          /* no electron → no printer config persistence */
        });
      }

      toast("Settings saved successfully", "success");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Failed to save settings",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // ── PIN change ─────────────────────────────────────────────────────────────
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin.length < 6) {
      toast("New PIN must be at least 6 digits", "error");
      return;
    }
    if (hasPin && pinForm.currentPin.length < 4) {
      toast("Current PIN is required to change the admin PIN.", "error");
      return;
    }
    setSavingPin(true);
    try {
      await api.post(API.CENTER_PIN, {
        newPin: pinForm.newPin,
        ...(hasPin ? { currentPin: pinForm.currentPin } : {}),
      });
      setPinForm({ currentPin: "", newPin: "" });
      setHasPin(true);
      toast("Admin PIN updated", "success");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Failed to update PIN",
        "error"
      );
    } finally {
      setSavingPin(false);
    }
  };

  const handleTestPrint = async () => {
    if (!isBridgeAvailable()) {
      toast("Printing is only available in the desktop app", "info");
      return;
    }
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

  if (!isAdmin) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Lock className="h-8 w-8" />
        <p className="text-sm">Settings are admin-only.</p>
      </div>
    );
  }

  const assetUrl = (kind: BrandingAssetKind) =>
    hasAsset[kind]
      ? `${API.CENTER_BRANDING_ASSET(kind)}?v=${assetVersion[kind]}`
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">
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

      <SectionCard
        icon={Wallet}
        title="Branding & Payment"
        subtitle="Logo and UPI QR are embedded into every invoice PDF"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <BrandingUploader
            kind="logo"
            title="Company Logo"
            description="Shown in the top-left of every invoice. PNG or JPEG, max 2 MB. Upload requires Admin PIN."
            icon={ImageIcon}
            previewUrl={assetUrl("logo")}
            uploading={uploading === "logo"}
            inputRef={logoInputRef}
            onPick={(file) => handleBrandingFile("logo", file)}
            onDelete={() => handleBrandingDelete("logo")}
            previewClassName="h-24 w-24 object-contain"
            placeholder="No logo uploaded"
          />
          <BrandingUploader
            kind="upiQr"
            title="UPI QR Code"
            description="Printed in the invoice footer so customers can scan to pay. Upload requires Admin PIN."
            icon={QrCode}
            previewUrl={assetUrl("upiQr")}
            uploading={uploading === "upiQr"}
            inputRef={qrInputRef}
            onPick={(file) => handleBrandingFile("upiQr", file)}
            onDelete={() => handleBrandingDelete("upiQr")}
            previewClassName="h-24 w-24 object-contain"
            placeholder="No UPI QR uploaded"
          />
        </div>

        <div className="mt-6 max-w-md">
          <FieldLabel hint="optional">UPI ID (text)</FieldLabel>
          <input
            type="text"
            value={form.upiId}
            onChange={(e) => set("upiId", e.target.value)}
            placeholder="yourname@upi"
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Printed alongside the QR as &quot;Pay via UPI: yourname@upi&quot;.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        icon={Key}
        title="Admin PIN"
        subtitle="Required to authorize destructive operations (delete, cancel, branding upload)"
      >
        <div className="grid grid-cols-2 gap-4 max-w-xl">
          {hasPin && (
            <div>
              <FieldLabel required>Current PIN</FieldLabel>
              <input
                type="password"
                value={pinForm.currentPin}
                onChange={(e) =>
                  setPinForm((p) => ({ ...p, currentPin: e.target.value }))
                }
                className={inputCls}
                autoComplete="off"
              />
            </div>
          )}
          <div>
            <FieldLabel required hint="min 6 chars">
              New PIN
            </FieldLabel>
            <input
              type="password"
              value={pinForm.newPin}
              onChange={(e) =>
                setPinForm((p) => ({ ...p, newPin: e.target.value }))
              }
              className={inputCls}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={handlePinSubmit}
            disabled={savingPin}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2",
              "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark",
              "disabled:opacity-60"
            )}
          >
            {savingPin ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Key className="h-4 w-4" />
            )}
            {hasPin ? "Change PIN" : "Set PIN"}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        icon={Printer}
        title="Printer Settings"
        subtitle="Configure your thermal receipt printer (desktop / Electron only)"
      >
        {hasBridge === false ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <PrinterIcon className="mb-2 h-8 w-8 opacity-20" />
            <p className="text-sm">Printer settings are only available in the desktop app.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required hint="IP or USB">
                  Printer Interface
                </FieldLabel>
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
              <label
                htmlFor="printUpiQr"
                className="text-sm font-medium text-foreground"
              >
                Print UPI QR Code on Receipts
              </label>
            </div>

            <div className="pt-2 border-t border-border mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Click test to verify printer connection with current unsaved
                settings.
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
        )}
      </SectionCard>

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

      {pendingUpload && (
        <PinPromptModal
          title="Upload Branding"
          description={`Enter Admin PIN to upload ${
            pendingUpload.kind === "logo" ? "the company logo" : "the UPI QR"
          }. This image appears on every invoice.`}
          confirmLabel="Upload"
          onConfirm={confirmUpload}
          onCancel={() => setPendingUpload(null)}
        />
      )}
    </form>
  );
}
