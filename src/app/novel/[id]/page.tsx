import { createServerClient } from '@/integrations/supabase/server';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Legacy route: /novel/[id]
 * Permanently redirects to the new SEO-friendly URL: /truyen/[slug]
 */
export default async function LegacyNovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: novel } = await supabase
    .from('novels')
    .select('slug')
    .eq('id', id)
    .single();

  if (!novel?.slug) {
    notFound();
  }

  redirect(`/truyen/${novel.slug}`);
}
