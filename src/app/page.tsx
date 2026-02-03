import { NovelCard } from '@/components/novel-card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import {
  ChevronRight,
  ChevronLeft,
  Star,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { createServerClient } from '@/integrations/supabase/server';
import { Novel } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  let novels: Novel[] | null = null;

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('novels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching novels:', error);
    } else {
      novels = data;
    }
  } catch (err) {
    console.error('Failed to connect to database:', err);
  }

  const featuredNovel = novels?.[0];
  const trendingNovels = novels?.slice(0, 5) || [];
  const latestNovels = novels?.slice(0, 6) || [];
  const rankingNovels = novels?.slice(0, 6) || [];

  const genres = ['Tiên Hiệp', 'Khoa Huyễn', 'Huyền Ảo', 'Đô Thị', 'Ngôn Tình', 'Kiếm Hiệp'];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header title="Truyện City" variant="search" />
      </div>

      <div className="px-4 lg:px-6 py-6 lg:py-8">
        {/* Main Content Grid */}
        <div className="flex gap-8">
          {/* Left Content Area */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Hero Section */}
            {featuredNovel && (
              <section>
                <NovelCard
                  id={featuredNovel.id}
                  title={featuredNovel.title}
                  author={featuredNovel.author || 'N/A'}
                  cover={featuredNovel.cover_url || ''}
                  rating={4.9}
                  views={850000}
                  status={featuredNovel.status || 'Đang ra'}
                  description="Trong cơn thủy triều hơi nước và máy móc, ai có thể chạm đến phi phàm? Sương mù xám phía trên, ai đang thì thầm?"
                  variant="featured"
                />
              </section>
            )}

            {/* Trending This Week */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-rating" />
                  <h2 className="text-lg font-semibold">Thịnh hành tuần này</h2>
                </div>
                <Link
                  href="/ranking"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Xem tất cả
                  <ChevronRight size={16} />
                </Link>
              </div>

              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {trendingNovels.map((novel: Novel, index) => (
                    <div key={novel.id} className="flex-shrink-0 w-[160px]">
                      <NovelCard
                        id={novel.id}
                        title={novel.title}
                        author={novel.author || 'N/A'}
                        cover={novel.cover_url || ''}
                        rating={4.5 + (index * 0.1)}
                        views={1200000 - (index * 100000)}
                        status={index % 3 === 0 ? 'Full' : 'Đang ra'}
                        genre={genres[index % genres.length]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Latest Updates */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Mới cập nhật</h2>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestNovels.map((novel: Novel, index) => (
                  <NovelCard
                    key={novel.id}
                    id={novel.id}
                    title={novel.title}
                    author={novel.author || 'N/A'}
                    cover={novel.cover_url || ''}
                    rating={4.5}
                    views={1000}
                    chapters={1420 - (index * 200)}
                    status={index % 2 === 0 ? 'Đang ra' : 'Full'}
                    genre={genres[index % genres.length]}
                    description="Một đời Đan Đế trong sinh, mở ra con đường nghịch thiên cải mệnh, trấn áp vạn cổ thiên kiêu."
                    variant="horizontal"
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right Sidebar - Rankings */}
          <aside className="hidden xl:block w-[280px] flex-shrink-0">
            <div className="sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-destructive" />
                <h2 className="text-lg font-semibold">Bảng Xếp Hạng</h2>
              </div>

              <div className="space-y-2">
                {rankingNovels.map((novel: Novel, index) => (
                  <NovelCard
                    key={novel.id}
                    id={novel.id}
                    title={novel.title}
                    author={novel.author || 'N/A'}
                    cover={novel.cover_url || ''}
                    rating={4.9 - (index * 0.1)}
                    views={1000}
                    status={novel.status || 'Đang ra'}
                    genre={genres[index % genres.length]}
                    variant="ranking"
                    rank={index + 1}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full mt-4 rounded-xl"
                asChild
              >
                <Link href="/ranking">Xem đầy đủ</Link>
              </Button>

              {/* Ad Placeholder */}
              <div className="mt-6 h-[250px] bg-muted rounded-2xl flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Khu vực Quảng Cáo</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
