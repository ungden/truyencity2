import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ReadingProvider } from "@/contexts/reading-context";
import ThemeProvider from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/providers/query-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { WebsiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";
import { VipProvider } from "@/contexts/vip-context";

export const metadata: Metadata = {
  metadataBase: new URL("https://truyencity.com"),
  title: {
    default: "TruyenCity - Đọc Truyện Online Miễn Phí",
    template: "%s | TruyenCity",
  },
  description: "Nền tảng đọc truyện tiên tiến nhất của người Việt cho người Việt. Hàng ngàn bộ truyện tiên hiệp, huyền huyễn, đô thị, ngôn tình — đọc miễn phí, cập nhật liên tục.",
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
  const adsensePubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || "";
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID || "";

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Structured Data */}
        <WebsiteJsonLd />
        <OrganizationJsonLd />
      </head>
      <body className="font-sans antialiased">
        {/* Google Analytics 4 */}
        {ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`}
            </Script>
          </>
        )}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
        >
          Bỏ qua đến nội dung chính
        </a>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <VipProvider>
              <ReadingProvider>
                <AppShell>
                  <main id="main-content">{children}</main>
                </AppShell>
                <Toaster />
              </ReadingProvider>
            </VipProvider>
          </ThemeProvider>
        </QueryProvider>
        {/* Google AdSense — loaded lazily, only when pub ID is set */}
        {adsensePubId && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePubId}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
