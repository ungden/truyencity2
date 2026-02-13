import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type NovelRow = {
  id: string;
  slug: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string | null;
  genres: string[] | null;
  updated_at: string | null;
  created_at: string | null;
  total_chapters: number;
};

const chapterRangeOptions = [
  { id: 'all', label: 'Tất cả', min: 0, max: Infinity },
  { id: '0-50', label: '0-50 chương', min: 0, max: 50 },
  { id: '50-200', label: '50-200 chương', min: 50, max: 200 },
  { id: '200-500', label: '200-500 chương', min: 200, max: 500 },
  { id: '500+', label: '500+ chương', min: 500, max: Infinity },
];

const PAGE_SIZE = 30;

interface FetchNovelsParams {
  selectedGenres: string[];
  selectedStatus: string[];
  chapterRange: string;
  sortBy: string;
  pageParam: number;
}

async function fetchNovels({
  selectedGenres,
  selectedStatus,
  chapterRange,
  sortBy,
  pageParam,
}: FetchNovelsParams): Promise<NovelRow[]> {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('novels')
    .select('id,slug,title,author,cover_url,status,genres,updated_at,created_at,total_chapters');

  // Apply filters server-side
  if (selectedGenres.length > 0) {
    query = query.overlaps('genres', selectedGenres);
  }
  if (selectedStatus.length > 0) {
    query = query.in('status', selectedStatus);
  }

  // Apply chapter range filter server-side
  const range = chapterRangeOptions.find((r) => r.id === chapterRange);
  if (range && range.id !== 'all') {
    if (range.max === Infinity) {
      query = query.gte('total_chapters', range.min);
    } else {
      query = query.gte('total_chapters', range.min).lte('total_chapters', range.max);
    }
  }

  // Apply sort server-side
  switch (sortBy) {
    case 'title':
      query = query.order('title', { ascending: true });
      break;
    case 'chapters_desc':
      query = query.order('total_chapters', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false, nullsFirst: false });
      break;
    case 'updated':
    default:
      query = query.order('updated_at', { ascending: false, nullsFirst: false });
      break;
  }

  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Failed to fetch novels');
  }

  return (data || []) as NovelRow[];
}

interface UseNovelsInfiniteParams {
  selectedGenres: string[];
  selectedStatus: string[];
  chapterRange: string;
  sortBy: string;
}

export function useNovelsInfinite({
  selectedGenres,
  selectedStatus,
  chapterRange,
  sortBy,
}: UseNovelsInfiniteParams) {
  return useInfiniteQuery({
    queryKey: ['novels', { selectedGenres, selectedStatus, chapterRange, sortBy }],
    queryFn: ({ pageParam = 0 }) =>
      fetchNovels({
        selectedGenres,
        selectedStatus,
        chapterRange,
        sortBy,
        pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      // If last page has full PAGE_SIZE items, there might be more
      if (lastPage.length === PAGE_SIZE) {
        return allPages.length; // Next page number
      }
      return undefined; // No more pages
    },
    initialPageParam: 0,
    // Prefetch next page when user is close to the end
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
