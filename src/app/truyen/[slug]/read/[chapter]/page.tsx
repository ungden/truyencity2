import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/integrations/supabase/server';
import ReadingPageClient from './reading-page-client';

export const dynamic = 'force-dynamic';

type PageParams = {
  slug: string;
  chapter: string;
};

async function getReaderMetadata(slug: string, chapterNumber: number) {
  const supabase = await createServerClient();

  const { data: novel } = await supabase
    .from('novels')
    .select('id, title, author, slug')
    .eq('slug', slug)
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
}

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
