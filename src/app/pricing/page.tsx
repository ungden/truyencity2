import type { Metadata } from "next";
import { PricingPageClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Bảng giá VIP",
  description:
    "Các gói VIP đọc truyện và viết truyện trên TruyenCity. Đọc không quảng cáo, tải offline, nghe truyện không giới hạn.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Bảng giá VIP | TruyenCity",
    description:
      "Các gói VIP đọc truyện và viết truyện trên TruyenCity. Đọc không quảng cáo, tải offline, nghe truyện không giới hạn.",
    url: "https://truyencity.com/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bảng giá VIP | TruyenCity",
    description:
      "Các gói VIP đọc truyện và viết truyện trên TruyenCity. Đọc không quảng cáo, tải offline, nghe truyện không giới hạn.",
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
