import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getNovelById, getChaptersByNovelId } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { NovelCoverUpload } from '@/components/admin/novel-cover-upload';
import { RefreshableNovelPage } from '@/components/admin/refreshable-novel-page';

export const dynamic = 'force-dynamic';

export default async function NovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [novel, chapters] = await Promise.all([getNovelById(id), getChaptersByNovelId(id)]);

    if (!novel) {
      notFound();
    }

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/novels">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{novel.title}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Thông tin truyện
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <NovelCoverUpload novelId={novel.id} currentCoverUrl={novel.cover_url} />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Tác giả: {novel.author || 'Chưa có'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Tạo: {new Date(novel.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Trạng thái:</span>
                    <Badge variant={novel.status === 'Hoàn thành' ? 'default' : 'secondary'}>
                      {novel.status}
                    </Badge>
                  </div>

                  {novel.genres && novel.genres.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Thể loại:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {novel.genres.map((genre: string) => (
                          <Badge key={genre} variant="outline" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {novel.description && (
                    <div>
                      <span className="text-sm font-medium">Mô tả:</span>
                      <p className="text-sm text-muted-foreground mt-1">{novel.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Suspense fallback={<div>Đang tải...</div>}>
              <RefreshableNovelPage novelId={id} initialChapters={chapters} />
            </Suspense>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading novel:', error);
    notFound();
  }
}