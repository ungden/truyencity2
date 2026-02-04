import { MetadataRoute } from 'next';
import { createServerClient } from '@/integrations/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://truyencity.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/ranking`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ];

  // Dynamic novel pages
  try {
    const supabase = await createServerClient();
    const { data: novels } = await supabase
      .from('novels')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000);

    const novelPages: MetadataRoute.Sitemap = (novels || []).map((novel) => ({
      url: `${baseUrl}/novel/${novel.id}`,
      lastModified: novel.updated_at ? new Date(novel.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...novelPages];
  } catch {
    return staticPages;
  }
}
