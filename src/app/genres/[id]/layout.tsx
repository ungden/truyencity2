import { Metadata } from "next";
import { getGenreLabel } from "@/lib/utils/genre";

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

export default function GenreDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
