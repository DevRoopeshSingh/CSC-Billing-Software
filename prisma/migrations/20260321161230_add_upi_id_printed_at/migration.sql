-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "remarks" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "customerNotes" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "printedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CenterProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "centerName" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "udyamNumber" TEXT NOT NULL DEFAULT '',
    "logoPath" TEXT,
    "upiQrPath" TEXT,
    "upiId" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "invoiceNumber" INTEGER NOT NULL DEFAULT 0,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "defaultTaxRate" REAL NOT NULL DEFAULT 0,
    "defaultPaymentMode" TEXT NOT NULL DEFAULT 'Cash',
    "lastBackupDate" DATETIME,
    "pinHash" TEXT
);
INSERT INTO "new_CenterProfile" ("address", "centerName", "email", "id", "invoiceNumber", "invoicePrefix", "logoPath", "mobile", "udyamNumber", "upiQrPath") SELECT "address", "centerName", "email", "id", "invoiceNumber", "invoicePrefix", "logoPath", "mobile", "udyamNumber", "upiQrPath" FROM "CenterProfile";
DROP TABLE "CenterProfile";
ALTER TABLE "new_CenterProfile" RENAME TO "CenterProfile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
