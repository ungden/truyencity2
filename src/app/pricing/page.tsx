import type { Metadata } from "next";
import { PricingPageClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Bảng giá VIP",
  description:
    "Các gói VIP đọc truyện và viết truyện trên TruyenCity. Đọc không quảng cáo, tải offline, nghe truyện không giới hạn.",
};

export default function PricingPage() {
  return <PricingPageClient />;
}
