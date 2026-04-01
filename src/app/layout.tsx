import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import OfflineToast from "@/components/OfflineToast";
import PinLock from "@/components/PinLock";
import GlobalShortcuts from "@/components/GlobalShortcuts";
import { ToastProvider } from "@/components/ToastProvider";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import { CoPilotProvider } from "@/components/CoPilotContext";
import CommandPalette from "@/components/CommandPalette";
import CoPilotDrawer from "@/components/CoPilotDrawer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "CSC Billing Software",
  description: "Local billing and invoice management for your CSC center",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let hasPin = false;
  try {
    const profile = await prisma.centerProfile.findUnique({ where: { id: 1 } });
    hasPin = !!profile?.pinHash;
  } catch (e) {
    // Database might not be initialized yet
  }

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <CommandPaletteProvider>
            <CoPilotProvider>
              <PinLock pinEnabled={hasPin}>
                <div className="app-shell">
                  <Sidebar />
                  <div className="main-wrapper">
                    <Topbar />
                    <main className="main-content">
                      <div className="content-container">
                        {children}
                      </div>
                    </main>
                  </div>
                </div>
                <OfflineToast />
                <GlobalShortcuts />
                <CommandPalette />
                <CoPilotDrawer />
              </PinLock>
            </CoPilotProvider>
          </CommandPaletteProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

