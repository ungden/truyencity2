import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Card } from '@/components/ui/card';
import { GENRE_CONFIG } from '@/lib/types/genre-config';
import { supabase } from '@/integrations/supabase/client';
import { unstable_cache } from 'next/cache';
import { AdPlacement } from '@/components/ads/AdPlacement';

export const metadata: Metadata = {
  title: "Thể Loại Truyện",
  description: "Duyệt truyện theo thể loại: tiên hiệp, huyền huyễn, đô thị, ngôn tình, kiếm hiệp, khoa huyễn và nhiều hơn nữa.",
  alternates: { canonical: "/genres" },
};

// ISR: genre counts change slowly. Wrapped in unstable_cache because supabase-js
// fetches are no-store under Next 15 and would otherwise force dynamic rendering.
// Cookieless anon client keeps the route statically generatable.
export const revalidate = 3600;

// TODO: Replace with DB-level RPC `get_genre_counts()` when novel count exceeds 10K
const getGenreCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const { data: novels } = await supabase
      .from('novels')
      .select('genres')
      .eq('hidden', false)
      .not('genres', 'is', null)
      .limit(10000);

    const counts: Record<string, number> = {};
    for (const n of novels || []) {
      const genres = n.genres as string[] | null;
      if (genres) {
        for (const g of genres) {
          counts[g] = (counts[g] || 0) + 1;
        }
      }
    }
    return counts;
  },
  ['genre-counts'],
  { revalidate: 3600 },
);

export default async function GenresPage() {
  const genreCounts = await getGenreCounts();

  const genres = Object.entries(GENRE_CONFIG).map(([key, config]) => ({
    id: key,
    ...config,
    count: genreCounts[key] || 0,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <Header title="Thể loại" showSearch={false} />
      </div>

      <div className="px-4 lg:px-6 py-6 lg:py-8">
        <h1 className="text-2xl font-bold mb-6 hidden lg:block">Thể loại truyện</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {genres.map((genre) => (
            <Link key={genre.id} href={`/genres/${genre.id}`}>
              <Card className="p-5 hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{genre.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base">{genre.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {genre.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {genre.count} truyện
                    </p>
                  </div>
                </div>

                {/* Topics */}
                {genre.topics && genre.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 ml-12">
                    {genre.topics.map((topic) => (
                      <span
                        key={topic.id}
                        className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                      >
                        {topic.name}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>

        {/* Ad: after genre grid */}
        <AdPlacement placement="between-content" slot="genres-bottom" />
      </div>
    </div>
  );
}
