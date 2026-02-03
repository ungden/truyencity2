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
  ChevronRight
} from 'lucide-react';
import { createServerClient } from '@/integrations/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { GENRE_CONFIG, type Topic } from '@/lib/types/genre-config';
import SafeImage from '@/components/ui/safe-image';
import { ChapterList } from '@/components/chapter-list';
import { NovelActions } from '@/components/novel-actions';
import { AppContainer, TwoColumnLayout, ContentCard, Section } from '@/components/layout';

export const dynamic = 'force-dynamic';

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export default async function NovelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: novel, error } = await supabase
    .from('novels')
    .select('*, chapters(id, title, chapter_number)')
    .eq('id', id)
    .single();

  if (error || !novel) {
    notFound();
  }

  const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
  const chapterCount = chapters.length;

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
      topic = mainGenre.topics?.find(t => t.id === topicId) || null;
    }
  }

  // Sidebar content for desktop
  const SidebarContent = (
    <div className="space-y-6">
      {/* Quick Stats */}
      <ContentCard>
        <h3 className="font-semibold mb-4">Thống kê</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Chương</span>
            <span className="font-bold text-blue-600">{chapterCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Số từ</span>
            <span className="font-bold text-green-600">{formatNumber(100000)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Lượt xem</span>
            <span className="font-bold text-purple-600">{formatNumber(1000)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Đánh giá</span>
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500 fill-current" />
              <span className="font-bold">4.5</span>
            </div>
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
            <span className="font-medium">{new Date(novel.created_at).toLocaleDateString('vi-VN')}</span>
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
              {/* Hero Section */}
              <Card className="p-0 overflow-hidden border-0 shadow-lg rounded-2xl">
                <div className="relative h-48 bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/10">
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
                <div className="relative px-8 pb-8">
                  <div className="flex gap-6 -mt-20">
                    {/* Large Cover */}
                    <div className="relative flex-shrink-0">
                      <SafeImage
                        src={novel.cover_url}
                        alt={novel.title}
                        className="w-40 h-56 object-cover rounded-xl shadow-2xl ring-4 ring-background"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 pt-20 space-y-4">
                      <div>
                        <h1 className="text-3xl font-bold leading-tight mb-2">{novel.title}</h1>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User size={16} />
                            {novel.author ? (
                              <Link
                                href={`/authors/${encodeURIComponent(novel.author)}`}
                                className="hover:text-primary transition-colors"
                              >
                                {novel.author}
                              </Link>
                            ) : (
                              <span>Chưa rõ</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={16} className="text-yellow-500 fill-current" />
                            <span className="font-medium text-foreground">4.5</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye size={16} />
                            <span>{formatNumber(1000)} lượt xem</span>
                          </div>
                        </div>
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
                        <Badge variant={novel.status === 'Hoàn thành' ? 'default' : 'secondary'} className="px-3 py-1">
                          {novel.status || 'Đang ra'}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-2">
                        <Button asChild size="lg" className="rounded-xl shadow-md">
                          <Link href={`/novel/${novel.id}/read/1`}>
                            <BookOpen size={18} className="mr-2" />
                            Đọc từ đầu
                          </Link>
                        </Button>
                        <Button variant="outline" size="lg" className="rounded-xl">
                          <Heart size={18} className="mr-2" />
                          Yêu thích
                        </Button>
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
                    {novel.description || 'Chưa có mô tả.'}
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
                <ChapterList novelId={novel.id} chapters={chapters} />
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

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-500 fill-current" />
                    <span className="font-medium">4.5</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={14} className="text-muted-foreground" />
                    <span>{formatNumber(1000)}</span>
                  </div>
                </div>

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
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 rounded-xl">
              <div className="text-xl font-bold text-blue-600">{chapterCount}</div>
              <div className="text-xs text-muted-foreground">Chương</div>
            </Card>
            <Card className="p-4 text-center bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 rounded-xl">
              <div className="text-xl font-bold text-green-600">{formatNumber(100000)}</div>
              <div className="text-xs text-muted-foreground">Từ</div>
            </Card>
            <Card className="p-4 text-center bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 rounded-xl">
              <div className="text-xl font-bold text-purple-600">{formatNumber(1000)}</div>
              <div className="text-xs text-muted-foreground">Lượt xem</div>
            </Card>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Mô tả</h3>
            <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-0 rounded-xl">
              <p className="text-muted-foreground leading-relaxed text-sm">
                {novel.description || 'Chưa có mô tả.'}
              </p>
            </Card>
          </div>

          {/* Chapter List */}
          <ChapterList novelId={novel.id} chapters={chapters} />

          {/* Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Thông tin</h3>
            <Card className="p-4 space-y-3 bg-gradient-to-br from-card to-card/50 border-0 rounded-xl">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={14} />
                  <span>Cập nhật cuối</span>
                </div>
                <span className="font-medium">{new Date(novel.created_at).toLocaleDateString('vi-VN')}</span>
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