import { Header } from '@/components/header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Star,
  Eye,
  Clock,
  User,
  Calendar,
  Tag,
  BookOpen,
  Heart,
  Share2,
  ChevronRight,
  Bookmark,
  MessageSquare
} from 'lucide-react';
import { createServerClient } from '@/integrations/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { GENRE_CONFIG, type Topic } from '@/lib/types/genre-config';
import SafeImage from '@/components/ui/safe-image';
import { ChapterList } from '@/components/chapter-list';
import { NovelActions } from '@/components/novel-actions';
import { AppContainer, TwoColumnLayout, ContentCard, Section } from '@/components/layout';
import { Comments } from '@/components/comments';
import { StarDisplay } from '@/components/star-rating';
import { RelatedNovels } from '@/components/related-novels';
import { AuthorWorks } from '@/components/author-works';
import { NovelRatingSection } from './rating-section';
import { cleanNovelDescription } from '@/lib/utils';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Helper: lookup novel by slug (or fallback to UUID for backwards compat)
async function getNovelBySlug(slug: string) {
  const supabase = await createServerClient();

  // Try slug first
  const { data: novel, error } = await supabase
    .from('novels')
    .select('*, chapters(id, title, chapter_number)')
    .eq('slug', slug)
    .single();

  if (!error && novel) return novel;

  // Fallback: if slug looks like a UUID, try by id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(slug)) {
    const { data: novelById } = await supabase
      .from('novels')
      .select('*, chapters(id, title, chapter_number)')
      .eq('id', slug)
      .single();

    if (novelById) {
      // Redirect to canonical slug URL
      redirect(`/truyen/${novelById.slug}`);
    }
  }

  return null;
}

// SEO: generateMetadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: novel } = await supabase
    .from('novels')
    .select('title, description, author, cover_url, genres')
    .eq('slug', slug)
    .single();

  if (!novel) {
    return { title: 'Truyện không tồn tại - Truyện City' };
  }

  const title = `${novel.title} - ${novel.author || 'Truyện City'}`;
  const description = cleanNovelDescription(novel.description).slice(0, 160) || `Đọc ${novel.title} miễn phí tại Truyện City`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: novel.cover_url ? [{ url: novel.cover_url }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: novel.cover_url ? [novel.cover_url] : [],
    },
  };
}

export default async function NovelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const novel = await getNovelBySlug(slug);

  if (!novel) {
    notFound();
  }

  const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
  const chapterCount = chapters.length;

  // Get stats from database
  const supabase = await createServerClient();
  
  // Parallel fetch: views, bookmarks, rating stats
  const [viewResult, bookmarkResult, ratingRaw] = await Promise.all([
    supabase
      .from('chapter_reads')
      .select('*', { count: 'exact', head: true })
      .eq('novel_id', novel.id),
    supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('novel_id', novel.id),
    supabase
      .from('ratings')
      .select('score')
      .eq('novel_id', novel.id),
  ]);

  const totalViews = viewResult.count || 0;
  const totalBookmarks = bookmarkResult.count || 0;
  const ratingScores = ratingRaw.data || [];
  const ratingCount = ratingScores.length;
  const ratingAvg = ratingCount > 0
    ? Math.round((ratingScores.reduce((s: number, r: { score: number }) => s + r.score, 0) / ratingCount) * 100) / 100
    : 0;

  let mainGenre: (typeof GENRE_CONFIG)[keyof typeof GENRE_CONFIG] | null = null;
  let topic: Topic | null = null;
  let mainGenreId: string | null = null;

  if (Array.isArray(novel.genres) && novel.genres.length > 0) {
    mainGenreId = novel.genres[0] || null;
    const topicId = novel.genres[1];

    if (mainGenreId) {
      mainGenre = GENRE_CONFIG[mainGenreId as keyof typeof GENRE_CONFIG] || null;
    }
    if (mainGenre && topicId) {
      topic = mainGenre.topics?.find((t: Topic) => t.id === topicId) || null;
    }
  }

  const novelSlug = novel.slug || novel.id;

  // Format large numbers
  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('vi-VN');
  };

  // Sidebar content for desktop
  const SidebarContent = (
    <div className="space-y-6">
      {/* Rating Card */}
      <ContentCard>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Star size={16} className="text-yellow-500" />
          Đánh giá
        </h3>
        <div className="text-center space-y-3">
          <div className="text-4xl font-bold text-yellow-500">
            {ratingAvg > 0 ? ratingAvg.toFixed(1) : '--'}
          </div>
          <StarDisplay rating={ratingAvg} size="lg" showCount={false} />
          <p className="text-sm text-muted-foreground">
            {ratingCount > 0 ? `${ratingCount.toLocaleString('vi-VN')} lượt đánh giá` : 'Chưa có đánh giá'}
          </p>
          <NovelRatingSection novelId={novel.id} />
        </div>
      </ContentCard>

      {/* Stats Card */}
      <ContentCard>
        <h3 className="font-semibold mb-4">Thống kê</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen size={14} />
              <span>Chương</span>
            </div>
            <span className="font-bold text-blue-500">{chapterCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye size={14} />
              <span>Lượt đọc</span>
            </div>
            <span className="font-bold text-purple-500">{formatNumber(totalViews)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bookmark size={14} />
              <span>Yêu thích</span>
            </div>
            <span className="font-bold text-red-500">{formatNumber(totalBookmarks)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star size={14} />
              <span>Đánh giá</span>
            </div>
            <span className="font-bold text-yellow-500">{ratingAvg > 0 ? ratingAvg.toFixed(1) : '--'}</span>
          </div>
        </div>
      </ContentCard>

      {/* Info Card */}
      <ContentCard>
        <h3 className="font-semibold mb-4">Thông tin</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User size={14} />
              <span>Tác giả</span>
            </div>
            {novel.author ? (
              <Link
                href={`/authors/${encodeURIComponent(novel.author)}`}
                className="font-medium hover:text-primary transition-colors"
              >
                {novel.author}
              </Link>
            ) : (
              <span className="text-muted-foreground">Chưa rõ</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14} />
              <span>Cập nhật</span>
            </div>
            <span className="font-medium">{new Date(novel.updated_at || novel.created_at).toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={14} />
              <span>Trạng thái</span>
            </div>
            <Badge variant={novel.status === 'Hoàn thành' ? 'default' : 'secondary'}>
              {novel.status || 'Đang ra'}
            </Badge>
          </div>
        </div>
      </ContentCard>

      {/* Topic Info */}
      {topic && (
        <ContentCard>
          <h3 className="font-semibold mb-3">Chủ đề</h3>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Tag size={16} className="text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">{topic.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{topic.description}</p>
            </div>
          </div>
        </ContentCard>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header title={novel.title} showBack />
      </div>

      <AppContainer className="py-6 lg:py-8">
        {/* Desktop: Two Column Layout */}
        <div className="hidden lg:block">
          <TwoColumnLayout sidebar={SidebarContent} sidebarPosition="right" sidebarWidth="sm">
            <div className="space-y-8">
              {/* Hero Section — WebNovel style */}
              <Card className="p-0 overflow-hidden border-0 shadow-lg rounded-2xl">
                <div className="relative h-56 bg-gradient-to-br from-primary/30 via-purple-500/20 to-blue-500/10">
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
                </div>
                <div className="relative px-8 pb-8">
                  <div className="flex gap-8 -mt-28">
                    {/* Large Cover — 250px width */}
                    <div className="relative flex-shrink-0">
                      <SafeImage
                        src={novel.cover_url}
                        alt={novel.title}
                        className="w-[200px] h-[280px] object-cover rounded-xl shadow-2xl ring-4 ring-background"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 pt-28 space-y-4">
                      <div>
                        <h1 className="text-3xl font-bold leading-tight mb-3">{novel.title}</h1>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User size={16} />
                            {novel.author ? (
                              <Link
                                href={`/authors/${encodeURIComponent(novel.author)}`}
                                className="hover:text-primary transition-colors font-medium"
                              >
                                {novel.author}
                              </Link>
                            ) : (
                              <span>Chưa rõ</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1.5">
                          <StarDisplay rating={ratingAvg} count={ratingCount} size="sm" />
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Eye size={14} />
                          <span>{formatNumber(totalViews)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <BookOpen size={14} />
                          <span>{chapterCount} chương</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Bookmark size={14} />
                          <span>{formatNumber(totalBookmarks)}</span>
                        </div>
                        <Badge variant={novel.status === 'Hoàn thành' ? 'default' : 'secondary'} className="text-xs">
                          {novel.status || 'Đang ra'}
                        </Badge>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {mainGenre && mainGenreId && (
                          <Link href={`/genres/${encodeURIComponent(mainGenreId)}`}>
                            <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-primary/10 transition-colors">
                              <span className="text-lg">{mainGenre.icon}</span>
                              {mainGenre.name}
                            </Badge>
                          </Link>
                        )}
                        {topic && (
                          <Link href={`/genres/${encodeURIComponent(topic.id)}`}>
                            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-muted transition-colors">
                              <Tag size={12} />
                              {topic.name}
                            </Badge>
                          </Link>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-2">
                        <Button asChild size="lg" className="rounded-xl shadow-md">
                          <Link href={`/truyen/${novelSlug}/read/1`}>
                            <BookOpen size={18} className="mr-2" />
                            Đọc từ đầu
                          </Link>
                        </Button>
                        {chapterCount > 1 && (
                          <Button asChild variant="outline" size="lg" className="rounded-xl">
                            <Link href={`/truyen/${novelSlug}/read/${chapterCount}`}>
                              Chương mới nhất
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="rounded-xl">
                          <Share2 size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Description */}
              <Section title="Mô tả">
                <ContentCard>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {cleanNovelDescription(novel.description) || 'Chưa có mô tả.'}
                  </p>
                </ContentCard>
              </Section>

              {/* Chapter List */}
              <Section
                title="Danh sách chương"
                subtitle={`${chapterCount} chương`}
                action={
                  <Button variant="ghost" size="sm" className="text-primary">
                    Xem tất cả
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                }
              >
                <ChapterList novelId={novel.id} novelSlug={novelSlug} chapters={chapters} />
              </Section>

              {/* Related Novels */}
              {Array.isArray(novel.genres) && novel.genres.length > 0 && (
                <Section title="Có thể bạn cũng thích">
                  <RelatedNovels novelId={novel.id} genres={novel.genres} limit={6} />
                </Section>
              )}

              {/* Author's Other Works */}
              {novel.author && (
                <Section title={`Tác phẩm cùng tác giả`}>
                  <AuthorWorks novelId={novel.id} authorName={novel.author} limit={6} />
                </Section>
              )}

              {/* Comments */}
              <Section title="Bình luận">
                <Comments novelId={novel.id} />
              </Section>
            </div>
          </TwoColumnLayout>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-6">
          {/* Mobile Hero */}
          <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-0 rounded-2xl">
            <div className="flex gap-4">
              <div className="relative flex-shrink-0">
                <SafeImage
                  src={novel.cover_url}
                  alt={novel.title}
                  className="w-28 h-40 object-cover rounded-xl shadow-lg"
                />
              </div>

              <div className="flex-1 space-y-2">
                <h1 className="text-xl font-bold leading-tight">{novel.title}</h1>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User size={14} />
                  {novel.author ? (
                    <Link
                      href={`/authors/${encodeURIComponent(novel.author)}`}
                      className="hover:underline"
                    >
                      {novel.author}
                    </Link>
                  ) : (
                    <span>Chưa rõ</span>
                  )}
                </div>

                {/* Rating */}
                <StarDisplay rating={ratingAvg} count={ratingCount} size="sm" />

                <div className="flex flex-wrap gap-2">
                  {mainGenre && mainGenreId && (
                    <Link href={`/genres/${encodeURIComponent(mainGenreId)}`}>
                      <Badge variant="outline" className="flex items-center gap-1 text-xs">
                        <span>{mainGenre.icon}</span>
                        {mainGenre.name}
                      </Badge>
                    </Link>
                  )}
                  <Badge variant={novel.status === 'Hoàn thành' ? 'default' : 'secondary'} className="text-xs">
                    {novel.status || 'Đang ra'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          <NovelActions novelId={novel.id} />

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            <Card className="p-3 text-center bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 rounded-xl">
              <BookOpen size={16} className="mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold text-blue-500">{chapterCount}</div>
              <div className="text-[10px] text-muted-foreground">Chương</div>
            </Card>
            <Card className="p-3 text-center bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 rounded-xl">
              <Eye size={16} className="mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold text-purple-500">{formatNumber(totalViews)}</div>
              <div className="text-[10px] text-muted-foreground">Lượt đọc</div>
            </Card>
            <Card className="p-3 text-center bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20 rounded-xl">
              <Bookmark size={16} className="mx-auto mb-1 text-red-500" />
              <div className="text-lg font-bold text-red-500">{formatNumber(totalBookmarks)}</div>
              <div className="text-[10px] text-muted-foreground">Yêu thích</div>
            </Card>
            <Card className="p-3 text-center bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 rounded-xl">
              <Star size={16} className="mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold text-yellow-500">{ratingAvg > 0 ? ratingAvg.toFixed(1) : '--'}</div>
              <div className="text-[10px] text-muted-foreground">Đánh giá</div>
            </Card>
          </div>

          {/* Rate this novel */}
          <Card className="p-4 border-0 bg-card rounded-xl">
            <h3 className="text-sm font-semibold mb-2">Đánh giá truyện này</h3>
            <NovelRatingSection novelId={novel.id} />
          </Card>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Mô tả</h3>
            <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-0 rounded-xl">
              <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">
                {cleanNovelDescription(novel.description) || 'Chưa có mô tả.'}
              </p>
            </Card>
          </div>

          {/* Chapter List */}
          <ChapterList novelId={novel.id} novelSlug={novelSlug} chapters={chapters} />

          {/* Related Novels */}
          {Array.isArray(novel.genres) && novel.genres.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Có thể bạn cũng thích</h3>
              <RelatedNovels novelId={novel.id} genres={novel.genres} limit={6} />
            </div>
          )}

          {/* Author Works */}
          {novel.author && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Tác phẩm cùng tác giả</h3>
              <AuthorWorks novelId={novel.id} authorName={novel.author} limit={6} />
            </div>
          )}

          {/* Comments */}
          <Comments novelId={novel.id} />

          {/* Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Thông tin</h3>
            <Card className="p-4 space-y-3 bg-gradient-to-br from-card to-card/50 border-0 rounded-xl">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={14} />
                  <span>Cập nhật cuối</span>
                </div>
                <span className="font-medium">{new Date(novel.updated_at || novel.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock size={14} />
                  <span>Trạng thái</span>
                </div>
                <Badge variant={novel.status === 'Hoàn thành' ? 'default' : 'secondary'} className="text-xs">
                  {novel.status || 'Đang ra'}
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      </AppContainer>
    </div>
  );
}
