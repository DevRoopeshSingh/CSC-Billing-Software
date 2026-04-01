import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/pin";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    
    if (!pin || pin.length !== 4) {
      return NextResponse.json({ valid: false, error: "Invalid PIN format" }, { status: 400 });
    }

    const profile = await prisma.centerProfile.findUnique({ where: { id: 1 } });
    
    if (!profile || !profile.pinHash) {
       return NextResponse.json({ valid: false, error: "No PIN configured" }, { status: 400 });
    }

    const isValid = await verifyPin(pin, profile.pinHash);
    
    if (isValid) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json({ valid: false });
    }
  } catch (error) {
    console.error("PIN verification error:", error);
    return NextResponse.json({ valid: false, error: "Internal Error" }, { status: 500 });
  }
}
