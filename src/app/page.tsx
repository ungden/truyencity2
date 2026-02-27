import { NovelCard } from '@/components/novel-card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import {
  ChevronRight,
  TrendingUp,
  Sparkles,
  Clock,
  Flame
} from 'lucide-react';
import Link from 'next/link';
import { createServerClient } from '@/integrations/supabase/server';
import { Novel } from '@/lib/types';
import { ContinueReading } from '@/components/continue-reading';
import { LatestUpdatesCarousel } from '@/components/latest-updates-carousel';

export const revalidate = 300;

// Helper to extract chapter count from total_chapters column
function getChapterCount(novel: Novel): number {
  return novel.total_chapters || 0;
}

export default async function HomePage() {
  // Allow builds/tests to succeed without Supabase env configured.
  // In production, these env vars must be set.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold">TruyenCity</h1>
          <p className="mt-2 text-muted-foreground">
            Missing Supabase environment variables. Set `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` to enable homepage data.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createServerClient();

  // Parallel fetch all data
  const [latestResult, newestResult, featuredResult, tienHiepResult, doThiResult] = await Promise.all([
    // Recently updated novels
    supabase
      .from('novels')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20),
    // Newly launched novels
    supabase
      .from('novels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12),
    // Featured: novels with covers, most chapters
    supabase
      .from('novels')
      .select('*')
      .not('cover_url', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10),
    // Tiên Hiệp genre
    supabase
      .from('novels')
      .select('*')
      .overlaps('genres', ['tien-hiep'])
      .not('cover_url', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(8),
    // Đô Thị genre
    supabase
      .from('novels')
      .select('*')
      .overlaps('genres', ['do-thi'])
      .not('cover_url', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(8),
  ]);

  const novels: Novel[] = latestResult.data || [];
  const newestNovelsRaw: Novel[] = newestResult.data || [];
  const featuredNovels: Novel[] = (featuredResult.data || [])
    .sort((a: Novel, b: Novel) => getChapterCount(b) - getChapterCount(a));
  const tienHiepNovels: Novel[] = tienHiepResult.data || [];
  const doThiNovels: Novel[] = doThiResult.data || [];

  // Featured = novel with most chapters and a cover
  const featuredNovel = featuredNovels[0] || novels[0];
  // Trending = novels with most chapters (active writing)
  const allSorted = [...novels].sort((a, b) => getChapterCount(b) - getChapterCount(a));
  const trendingNovels = allSorted.filter(n => n.id !== featuredNovel?.id).slice(0, 6);
  // Latest = most recently updated (excluding featured + trending)
  const usedIds = new Set([featuredNovel?.id, ...trendingNovels.map(n => n.id)]);
  const latestNovels = novels.filter(n => !usedIds.has(n.id)).slice(0, 8);
  const newestNovels = newestNovelsRaw.filter(n => !usedIds.has(n.id)).slice(0, 8);
  // Ranking = by chapter count
  const rankingNovels = allSorted.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header title="TruyenCity" variant="search" />
      </div>

      <div className="px-4 lg:px-6 py-6 lg:py-8">
        {/* Main Content Grid */}
        <div className="flex gap-8">
          {/* Left Content Area */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* Continue Reading (client component — only shows for logged in users) */}
            <ContinueReading />

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
                  imagePriority
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

            {/* Latest Updates with working carousel */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-primary" />
                  <h2 className="text-lg font-semibold">Mới cập nhật</h2>
                </div>
                <Link
                  href="/browse?sort=newest"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Truyện mới ra mắt
                  <ChevronRight size={16} />
                </Link>
              </div>
              <LatestUpdatesCarousel novels={latestNovels} />
            </section>

            {/* New Releases */}
            {newestNovels.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-emerald-500" />
                    <h2 className="text-lg font-semibold">Truyện mới ra mắt</h2>
                  </div>
                  <Link
                    href="/browse?sort=newest"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Xem tất cả
                    <ChevronRight size={16} />
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {newestNovels.map((novel: Novel) => (
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
              </section>
            )}

            {/* Tiên Hiệp Genre Section */}
            {tienHiepNovels.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">&#x2694;&#xFE0F;</span>
                    <h2 className="text-lg font-semibold">Tiên Hiệp Mới</h2>
                  </div>
                  <Link
                    href="/browse?genre=tien-hiep"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Xem tất cả
                    <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {tienHiepNovels.map((novel: Novel) => (
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
              </section>
            )}

            {/* Đô Thị Genre Section */}
            {doThiNovels.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame size={20} className="text-orange-500" />
                    <h2 className="text-lg font-semibold">Đô Thị Hot</h2>
                  </div>
                  <Link
                    href="/browse?genre=do-thi"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Xem tất cả
                    <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {doThiNovels.map((novel: Novel) => (
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
              </section>
            )}
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

              {/* TODO: Wire <AdPlacement placement="sidebar" slot="..." /> when ADSENSE_PUB_ID is set */}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
