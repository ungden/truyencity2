import type { Metadata } from "next";
import "./globals.css";
import { ReadingProvider } from "@/contexts/reading-context";
import ThemeProvider from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PWAProvider } from "@/components/pwa-provider";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "TruyenCity - AI Story Writer",
  description: "Nền tảng viết truyện AI thông minh - Viết truyện tự động với 1 click",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TruyenCity",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <PWAProvider>
            <ReadingProvider>
              <AppShell>
                {children}
              </AppShell>
              <Toaster />
            </ReadingProvider>
          </PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
