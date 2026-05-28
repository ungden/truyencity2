import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { unstable_cache } from 'next/cache';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NovelCard } from '@/components/novel-card';
import { User, BookOpen } from 'lucide-react';
import { GENRE_CONFIG } from '@/lib/types/genre-config';
import { AdPlacement } from '@/components/ads/AdPlacement';

// ISR: public author page. Wrapped in unstable_cache (supabase-js fetches are
// no-store under Next 15) + cookieless anon client so it renders in the initial
// HTML (crawlable, no loader spinner). notFound() is called by the page body, not
// inside the cache (unstable_cache cannot contain dynamic functions).
export const revalidate = 300;

type AuthorDetails = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  specialized_genres: string[] | null;
};

type NovelBrief = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
};

const fetchAuthorPage = unstable_cache(
  async (
    authorName: string,
  ): Promise<{ author: AuthorDetails | null; novels: NovelBrief[] }> => {
    const { data: authorData } = await supabase
      .from('ai_authors')
      .select('id, name, bio, avatar_url, specialized_genres')
      .eq('name', authorName)
      .maybeSingle();

    if (!authorData) {
      return { author: null, novels: [] };
    }

    const { data: novelData } = await supabase
      .from('novels')
      .select('id, title, author, cover_url, status')
      .eq('author', authorName)
      .order('updated_at', { ascending: false })
      .limit(100);

    return {
      author: authorData as AuthorDetails,
      novels: (novelData as NovelBrief[] | null) ?? [],
    };
  },
  ['author-page'],
  { revalidate: 300 },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const authorName = decodeURIComponent(name);
  return {
    title: `Tác giả ${authorName}`,
    description: `Các tác phẩm của tác giả ${authorName} trên TruyenCity.`,
    alternates: { canonical: `/authors/${encodeURIComponent(authorName)}` },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const authorName = decodeURIComponent(name);
  const { author, novels } = await fetchAuthorPage(authorName);

  if (!author) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Tác giả" showBack />

      <main className="px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-lg">
              <AvatarImage src={author.avatar_url || undefined} />
              <AvatarFallback>
                <User size={40} />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{author.name}</h1>
              {author.bio && (
                <p className="text-muted-foreground mt-2 text-sm">{author.bio}</p>
              )}
              {author.specialized_genres && author.specialized_genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                  {author.specialized_genres.map(genreId => {
                    const genreConfig = GENRE_CONFIG[genreId as keyof typeof GENRE_CONFIG];
                    if (!genreConfig) return null;
                    return (
                      <Badge key={genreId} variant="secondary" className="flex items-center gap-1">
                        <span className="text-base">{genreConfig.icon}</span>
                        {genreConfig.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        <AdPlacement placement="between-content" slot="author-between" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={20} />
              Tác phẩm ({novels.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {novels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {novels.map((novel) => (
                  <NovelCard
                    key={novel.id}
                    id={novel.id}
                    title={novel.title}
                    author={novel.author || 'N/A'}
                    cover={novel.cover_url || ''}
                    status={novel.status || 'Đang ra'}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Chưa có tác phẩm nào của tác giả này.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
