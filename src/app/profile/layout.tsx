import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ Sơ",
  description: "Xem và chỉnh sửa hồ sơ cá nhân trên TruyenCity.",
  alternates: { canonical: "/profile" },
  robots: { index: false, follow: true },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
