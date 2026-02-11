import { MetadataRoute } from 'next';
import { createServerClient } from '@/integrations/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://truyencity.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/ranking`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/genres`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/library`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
  ];

  try {
    const supabase = await createServerClient();

    // Dynamic novel pages — use slug for SEO-friendly URLs
    const { data: novels } = await supabase
      .from('novels')
      .select('slug, updated_at')
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(2000);

    const novelPages: MetadataRoute.Sitemap = (novels || []).map((novel) => ({
      url: `${baseUrl}/truyen/${novel.slug}`,
      lastModified: novel.updated_at ? new Date(novel.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Genre pages
    const { data: genres } = await supabase
      .from('novels')
      .select('genre')
      .not('genre', 'is', null);

    const uniqueGenres = [...new Set((genres || []).map((g) => g.genre).filter(Boolean))];
    const genrePages: MetadataRoute.Sitemap = uniqueGenres.map((genre) => ({
      url: `${baseUrl}/genres/${encodeURIComponent(genre)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...novelPages, ...genrePages];
  } catch {
    return staticPages;
  }
}
