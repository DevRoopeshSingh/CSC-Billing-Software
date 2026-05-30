import type { Metadata, Viewport } from "next";
import { ClientLayout } from "./ClientLayout";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    template: "%s | CSC Billing",
    default: "CSC Billing Software",
  },
  description: "Enterprise-grade local billing and invoice management for CSC centers.",
  applicationName: "CSC Billing",
  authors: [{ name: "CSC Center" }],
  generator: "Next.js",
  keywords: ["billing", "invoice", "csc", "offline-first", "desktop", "pos"],
  creator: "CSC Network",
  publisher: "CSC Billing Solutions",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem("csc_theme") || "system";
                if (theme === "system") {
                  theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                }
                document.documentElement.setAttribute("data-theme", theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
