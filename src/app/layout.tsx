import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReadingProvider } from "@/contexts/reading-context";
import ThemeProvider from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PWAProvider } from "@/components/pwa-provider";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://truyencity.com"),
  title: {
    default: "TruyenCity - Đọc Truyện Online Miễn Phí",
    template: "%s | TruyenCity",
  },
  description: "Nền tảng đọc truyện tiên tiến nhất của người Việt cho người Việt. Hàng ngàn bộ truyện tiên hiệp, huyền huyễn, đô thị, ngôn tình — đọc miễn phí, cập nhật liên tục.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "TruyenCity",
    title: "TruyenCity - Đọc Truyện Online Miễn Phí",
    description: "Hàng ngàn bộ truyện tiên hiệp, huyền huyễn, đô thị, ngôn tình — đọc miễn phí, cập nhật liên tục.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "TruyenCity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TruyenCity - Đọc Truyện Online Miễn Phí",
    description: "Hàng ngàn bộ truyện tiên hiệp, huyền huyễn, đô thị, ngôn tình — đọc miễn phí, cập nhật liên tục.",
    images: ["/og-image.png"],
  },
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
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
        >
          Bỏ qua đến nội dung chính
        </a>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <PWAProvider>
              <ReadingProvider>
                <AppShell>
                  <main id="main-content">{children}</main>
                </AppShell>
                <Toaster />
              </ReadingProvider>
            </PWAProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
