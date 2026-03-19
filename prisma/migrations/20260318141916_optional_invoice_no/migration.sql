/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNo]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "invoiceNo" TEXT;

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
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "invoiceNumber" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_CenterProfile" ("address", "centerName", "email", "id", "logoPath", "mobile", "udyamNumber", "upiQrPath") SELECT "address", "centerName", "email", "id", "logoPath", "mobile", "udyamNumber", "upiQrPath" FROM "CenterProfile";
DROP TABLE "CenterProfile";
ALTER TABLE "new_CenterProfile" RENAME TO "CenterProfile";
CREATE TABLE "new_Service" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "defaultPrice" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Service" ("defaultPrice", "id", "isActive", "name", "taxRate") SELECT "defaultPrice", "id", "isActive", "name", "taxRate" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
