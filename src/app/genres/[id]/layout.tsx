import { Metadata } from "next";
import { getGenreLabel } from "@/lib/utils/genre";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const genreLabel = getGenreLabel(id) || decodeURIComponent(id);

  return {
    title: `Truyện ${genreLabel}`,
    description: `Đọc truyện thể loại ${genreLabel} miễn phí trên TruyenCity. Cập nhật liên tục, nhiều tác phẩm hay.`,
    alternates: { canonical: `/genres/${id}` },
  };
}

export default async function GenreDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const genreLabel = getGenreLabel(id) || decodeURIComponent(id);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Trang chủ", url: "https://truyencity.com" },
          { name: "Thể loại", url: "https://truyencity.com/browse" },
          { name: `Truyện ${genreLabel}`, url: `https://truyencity.com/genres/${id}` },
        ]}
      />
      {children}
    </>
  );
}
