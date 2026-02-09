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

// Helper to extract chapter count from joined data
function getChapterCount(novel: Novel): number {
  if (!novel.chapters || !novel.chapters.length) return 0;
  return novel.chapters[0]?.count || 0;
}

export default async function HomePage() {
  let novels: Novel[] | null = null;
  let featuredNovels: Novel[] | null = null;

  try {
    const supabase = await createServerClient();

    // Fetch recently updated novels (sorted by latest activity)
    const [latestResult, featuredResult] = await Promise.all([
      supabase
        .from('novels')
        .select('*, chapters(count)')
        .order('updated_at', { ascending: false })
        .limit(20),
      // Featured: novels with covers, most chapters (established stories)
      supabase
        .from('novels')
        .select('*, chapters(count)')
        .not('cover_url', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(10),
    ]);
    // Note: slug is included in '*' select from novels table

    if (latestResult.error) {
      console.error('Error fetching novels:', latestResult.error);
    } else {
      novels = latestResult.data;
    }

    if (!featuredResult.error) {
      // Pick the featured novel with the most chapters (most established)
      featuredNovels = (featuredResult.data || [])
        .sort((a: Novel, b: Novel) => getChapterCount(b) - getChapterCount(a));
    }
  } catch (err) {
    console.error('Failed to connect to database:', err);
  }

  // Featured = novel with most chapters and a cover
  const featuredNovel = featuredNovels?.[0] || novels?.[0];
  // Trending = novels with most chapters (active writing)
  const allSorted = [...(novels || [])].sort((a, b) => getChapterCount(b) - getChapterCount(a));
  const trendingNovels = allSorted.filter(n => n.id !== featuredNovel?.id).slice(0, 5);
  // Latest = most recently updated (excluding featured + trending)
  const usedIds = new Set([featuredNovel?.id, ...trendingNovels.map(n => n.id)]);
  const latestNovels = (novels || []).filter(n => !usedIds.has(n.id)).slice(0, 6);
  // Ranking = by chapter count (most content = most popular proxy)
  const rankingNovels = allSorted.slice(0, 6);

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
                  slug={featuredNovel.slug || undefined}
                  title={featuredNovel.title}
                  author={featuredNovel.author || 'N/A'}
                  cover={featuredNovel.cover_url || ''}
                  status={featuredNovel.status || 'Đang ra'}
                  description={featuredNovel.description || ''}
                  chapters={getChapterCount(featuredNovel)}
                  variant="featured"
                />
              </section>
            )}

            {/* Trending This Week */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-primary" />
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
                  {trendingNovels.map((novel: Novel) => (
                    <div key={novel.id} className="flex-shrink-0 w-[160px]">
                      <NovelCard
                        id={novel.id}
                        slug={novel.slug || undefined}
                        title={novel.title}
                        author={novel.author || 'N/A'}
                        cover={novel.cover_url || ''}
                        status={novel.status || 'Đang ra'}
                        genre={novel.genres?.[0]}
                        chapters={getChapterCount(novel)}
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
                {latestNovels.map((novel: Novel) => (
                  <NovelCard
                    key={novel.id}
                    id={novel.id}
                    slug={novel.slug || undefined}
                    title={novel.title}
                    author={novel.author || 'N/A'}
                    cover={novel.cover_url || ''}
                    status={novel.status || 'Đang ra'}
                    genre={novel.genres?.[0]}
                    description={novel.description || ''}
                    chapters={getChapterCount(novel)}
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
                <TrendingUp size={20} className="text-primary" />
                <h2 className="text-lg font-semibold">Bảng Xếp Hạng</h2>
              </div>

              <div className="space-y-2">
                {rankingNovels.map((novel: Novel, index) => (
                  <NovelCard
                    key={novel.id}
                    id={novel.id}
                    slug={novel.slug || undefined}
                    title={novel.title}
                    author={novel.author || 'N/A'}
                    cover={novel.cover_url || ''}
                    status={novel.status || 'Đang ra'}
                    genre={novel.genres?.[0]}
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
              <div className="mt-6 h-[250px] bg-card border border-border/50 rounded-2xl flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Khu vực Quảng Cáo</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
