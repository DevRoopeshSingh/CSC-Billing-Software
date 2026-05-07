# CSC Billing — First-Run Notes for Operators

This installer is **not yet code-signed**. Both Windows and macOS will show a one-time security warning on first launch. This is normal for the initial release. Follow the steps for your operating system.

---

## Windows — SmartScreen Warning

When you double-click `CSC Billing Setup 0.1.0.exe`, Windows Defender SmartScreen may show a blue dialog:

> **Windows protected your PC**
> Microsoft Defender SmartScreen prevented an unrecognized app from starting.

**To install:**
1. Click **More info** (small text under the message — not the OK button).
2. Click the **Run anyway** button that appears.
3. Continue with the installer normally.

This warning appears only the first time. After installation it will not appear again.

---

## macOS — Gatekeeper Warning

When you open `CSC Billing-0.1.0-arm64.dmg` and drag the app to Applications, double-clicking the app may show:

> **"CSC Billing" cannot be opened because the developer cannot be verified.**

**To open it:**
1. Open **Finder** and go to **Applications**.
2. **Right-click** (or Control-click) the **CSC Billing** icon.
3. Select **Open** from the menu.
4. A new dialog appears with an **Open** button — click it.

You only need to do this the first time. After that, double-clicking opens the app normally.

If the right-click method does not work, open **System Settings → Privacy & Security**, scroll to the bottom, and click **Open Anyway** next to the CSC Billing notice.

---

## What This Means

- The app is safe to run. The warnings exist because we have not yet purchased an Apple Developer ID certificate or a Windows EV code-signing certificate. These are commercial certificates that cost money per year and only suppress the first-run warning — they do not change what the app does.
- Code-signing is on the roadmap for a future release. Until then, the workarounds above are required.
- If your IT policy blocks unsigned apps, contact us before installing.

---

## After Installation — First Launch

1. The first time you open the app you will see the **Setup** screen, not the login screen.
2. Create your **admin** account with a username and password.
3. Set an **admin PIN** when prompted in Settings — this PIN is required for destructive actions like deleting invoices, restoring backups, and bulk-deleting services. Keep it private.
4. Go to **Settings → Center Profile** and fill in your shop name, address, mobile, UPI ID, and invoice prefix.
5. Go to **Settings → Printer** to configure your thermal printer (see operator manual).
6. Go to **Services** to review the pre-loaded CSC service catalogue and adjust prices.

---

## Backups

- The app **automatically** exports a backup to `Documents/CSC-Backups/` every time you close it. The last 7 daily backups are kept.
- You can also export a manual backup any time from **Settings → Backup**.
- **Keep a copy of these backups on a USB drive or external disk.** If the computer fails, the backup file is the only way to recover your invoices and customers.
- To migrate to a new computer: install the app on the new machine, set up an admin user, then use **Settings → Backup → Import Backup** with your saved `.db` file. You will be asked for the admin PIN.

---

## Support

Report issues to the developer. Include the app version (shown in **Settings**) and a description of what you were doing when the issue happened.
