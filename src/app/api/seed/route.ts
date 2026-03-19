import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CSC_SERVICES = [
  { name: "Aadhaar Update", category: "Govt Services", defaultPrice: 50, taxRate: 0 },
  { name: "Pan Card Application", category: "Govt Services", defaultPrice: 150, taxRate: 0 },
  { name: "Passport Application", category: "Govt Services", defaultPrice: 1500, taxRate: 0 },
  { name: "Voter ID Service", category: "Govt Services", defaultPrice: 50, taxRate: 0 },
  { name: "Driving License", category: "Govt Services", defaultPrice: 250, taxRate: 0 },
  { name: "Bank Passbook Print", category: "Banking & Payments", defaultPrice: 20, taxRate: 0 },
  { name: "UPI Money Transfer", category: "Banking & Payments", defaultPrice: 20, taxRate: 0 },
  { name: "Xerox / Print (B&W)", category: "Miscellaneous", defaultPrice: 10, taxRate: 0 },
  { name: "Xerox / Print (Color)", category: "Miscellaneous", defaultPrice: 20, taxRate: 0 },
  { name: "Form Filling", category: "Miscellaneous", defaultPrice: 100, taxRate: 0 },
  { name: "Electricity Bill Pay", category: "Utility Bills", defaultPrice: 20, taxRate: 0 },
  { name: "Mobile/DTH Recharge", category: "Utility Bills", defaultPrice: 10, taxRate: 0 },
];

export async function POST() {
  try {
    const count = await prisma.service.count();
    
    if (count > 0) {
      return NextResponse.json({ message: "Services already exist. Skipped seed.", seeded: false });
    }

    await prisma.service.createMany({
      data: CSC_SERVICES,
    });

    return NextResponse.json({ message: "Default CSC services seeded successfully.", seeded: true });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed default services" }, { status: 500 });
  }
}
