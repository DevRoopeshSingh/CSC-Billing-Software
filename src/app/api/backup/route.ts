import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// EXPORT ALL DATA
export async function GET() {
  try {
    const centerProfile = await prisma.centerProfile.findFirst();
    const services = await prisma.service.findMany();
    const customers = await prisma.customer.findMany();
    const invoices = await prisma.invoice.findMany({
      include: { items: true },
    });

    // Mark the last backup date in the database
    if (centerProfile) {
      await prisma.centerProfile.update({
        where: { id: centerProfile.id },
        data: { lastBackupDate: new Date() }
      });
      // also update the exported object so the backup represents the truth
      centerProfile.lastBackupDate = new Date();
    }

    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        centerProfile,
        services,
        customers,
        invoices,
      },
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="csc_billing_backup_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup export failed:", error);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}

// RESTORE DATA (DESTRUCTIVE OVERWRITE)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.data || !body.data.centerProfile) {
      return NextResponse.json({ error: "Invalid backup file format" }, { status: 400 });
    }

    const { centerProfile, services, customers, invoices } = body.data;

    // Execute a massive destructive transaction to perfectly mirror the backup
    await prisma.$transaction(async (tx) => {
      // 1. Wipe everything
      await tx.invoiceItem.deleteMany();
      await tx.invoice.deleteMany();
      await tx.customer.deleteMany();
      await tx.service.deleteMany();
      await tx.centerProfile.deleteMany();

      // 2. Insert CenterProfile
      if (centerProfile) {
        await tx.centerProfile.create({ data: centerProfile });
      }

      // 3. Insert Services
      if (services && services.length > 0) {
        await tx.service.createMany({ data: services });
      }

      // 4. Insert Customers
      if (customers && customers.length > 0) {
        await tx.customer.createMany({ data: customers });
      }

      // 5. Insert Invoices & Items manually to preserve IDs and relations
      if (invoices && invoices.length > 0) {
        for (const inv of invoices) {
          const { items, ...invoiceData } = inv;
          await tx.invoice.create({
            data: {
              ...invoiceData,
              items: {
                create: items.map((item: any) => {
                  const { id, invoiceId, ...itemData } = item; // Strip IDs so Prisma auto-creates or matches the relation
                  return itemData;
                }),
              },
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Restore completed successfully" });
  } catch (error) {
    console.error("Backup import failed:", error);
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 });
  }
}
