import { Metadata } from "next";

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  return {
    title: `Tác Giả ${decodedName}`,
    description: `Xem tất cả truyện của tác giả ${decodedName} trên TruyenCity.`,
    alternates: { canonical: `/authors/${name}` },
  };
}

export default function AuthorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
