import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin, verifyPin } from "@/lib/pin";

export async function POST(request: Request) {
  try {
    const { action, pin, currentPin } = await request.json();
    
    const profile = await prisma.centerProfile.findUnique({ where: { id: 1 } });
    if (!profile) return NextResponse.json({ error: "Center profile not found" }, { status: 404 });

    // Verify current PIN if one exists
    if (profile.pinHash) {
      if (!currentPin) return NextResponse.json({ error: "Current PIN required" }, { status: 400 });
      const isValid = await verifyPin(currentPin, profile.pinHash);
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect current PIN" }, { status: 400 });
      }
    }

    if (action === "set") {
      if (!pin || pin.length !== 4) return NextResponse.json({ error: "Invalid new PIN format" }, { status: 400 });
      const pinHash = await hashPin(pin);
      await prisma.centerProfile.update({
        where: { id: 1 },
        data: { pinHash }
      });
      return NextResponse.json({ success: true, message: "PIN set successfully" });
    } else if (action === "remove") {
      await prisma.centerProfile.update({
        where: { id: 1 },
        data: { pinHash: null }
      });
      return NextResponse.json({ success: true, message: "PIN removed successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PIN config error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
