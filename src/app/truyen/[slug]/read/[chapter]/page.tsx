import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { unstable_cache } from 'next/cache';
import ReadingPageClient from './reading-page-client';

// ISR: cache rendered chapter pages for 5 minutes. Metadata reads use the
// cookieless anon client so the route can be statically generated (the SSR
// cookie client would force dynamic rendering and defeat caching). All
// personalized reader state is fetched client-side in ReadingPageClient.
export const revalidate = 300;

type PageParams = {
  slug: string;
  chapter: string;
};

// Wrapped in unstable_cache: supabase-js fetches are no-store under Next 15, so
// without this the metadata reads re-run on every request and force the route
// dynamic. Cached 5 min, matching the page-level revalidate. Public data only.
const getReaderMetadata = unstable_cache(
  async (slug: string, chapterNumber: number) => {
    const { data: novel } = await supabase
      .from('novels')
      .select('id, title, author, slug')
      .eq('slug', slug)
      .eq('hidden', false)
      .maybeSingle();

    if (!novel) {
      return null;
    }

    const { data: chapter } = await supabase
      .from('chapters')
      .select('title, chapter_number')
      .eq('novel_id', novel.id)
      .eq('chapter_number', chapterNumber)
      .maybeSingle();

    return {
      novel,
      chapter,
    };
  },
  ['reader-metadata'],
  { revalidate: 300 },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);

  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    return {
      title: 'Chương truyện không hợp lệ - TruyenCity',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const data = await getReaderMetadata(slug, chapterNumber);
  if (!data?.novel || !data.chapter) {
    return {
      title: 'Không tìm thấy chương truyện - TruyenCity',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const chapterTitle = data.chapter.title || `Chương ${data.chapter.chapter_number}`;
  const novelTitle = data.novel.title;
  const author = data.novel.author || 'TruyenCity';
  const title = `${chapterTitle} - ${novelTitle}`;
  const description = `Đọc ${chapterTitle} của truyện ${novelTitle} bởi ${author} trên TruyenCity.`;
  const canonicalPath = `/truyen/${data.novel.slug}/read/${data.chapter.chapter_number}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://truyencity.com${canonicalPath}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ReadingPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug, chapter } = await params;
  const chapterNumber = Number(chapter);

  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    notFound();
  }

  return <ReadingPageClient novelSlug={slug} chapterNumber={chapterNumber} />;
}
