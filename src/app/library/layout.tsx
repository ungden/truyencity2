import { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Tủ Sách",
  description: "Quản lý lịch sử đọc truyện và danh sách yêu thích của bạn trên TruyenCity.",
  alternates: { canonical: "/library" },
  robots: { index: false, follow: true },
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", url: "https://truyencity.com" },
          { name: "Tủ Sách", url: "https://truyencity.com/library" },
        ]}
      />
      {children}
    </>
  );
}
