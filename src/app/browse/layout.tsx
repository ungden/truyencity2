import { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Duyệt Truyện",
  description: "Khám phá hàng ngàn bộ truyện tiên hiệp, huyền huyễn, đô thị, ngôn tình. Lọc theo thể loại, sắp xếp theo lượt đọc, đánh giá.",
  alternates: { canonical: "/browse" },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", url: "https://truyencity.com" },
          { name: "Duyệt Truyện", url: "https://truyencity.com/browse" },
        ]}
      />
      {children}
    </>
  );
}
