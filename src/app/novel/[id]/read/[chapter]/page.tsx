import { createServerClient } from '@/integrations/supabase/server';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Legacy route: /novel/[id]/read/[chapter]
 * Permanently redirects to: /truyen/[slug]/read/[chapter]
 */
export default async function LegacyReadingPage({
  params,
}: {
  params: Promise<{ id: string; chapter: string }>;
}) {
  const { id, chapter } = await params;
  const supabase = await createServerClient();

  const { data: novel } = await supabase
    .from('novels')
    .select('slug')
    .eq('id', id)
    .single();

  if (!novel?.slug) {
    notFound();
  }

  redirect(`/truyen/${novel.slug}/read/${chapter}`);
}
