import { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Bảng Xếp Hạng",
  description: "Bảng xếp hạng truyện hot nhất, đánh giá cao nhất, mới cập nhật. Top truyện tiên hiệp, huyền huyễn, đô thị trên TruyenCity.",
  alternates: { canonical: "/ranking" },
};

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", url: "https://truyencity.com" },
          { name: "Bảng Xếp Hạng", url: "https://truyencity.com/ranking" },
        ]}
      />
      {children}
    </>
  );
}
