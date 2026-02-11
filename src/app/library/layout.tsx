import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tủ Sách",
  description: "Quản lý lịch sử đọc truyện và danh sách yêu thích của bạn trên TruyenCity.",
  alternates: { canonical: "/library" },
  robots: { index: false, follow: true },
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
