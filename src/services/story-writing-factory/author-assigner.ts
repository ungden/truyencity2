/**
 * Author Assigner - Automatically assigns AI authors to stories
 *
 * Logic:
 * 1. If ai_author_id provided, use it
 * 2. Otherwise, find a matching active author for the genre
 * 3. If no matching author, optionally create a new one
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateQuickAuthor, AuthorGenerator } from './author-generator';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export interface AuthorAssignmentResult {
  authorId: string;
  authorName: string;
  isNewAuthor: boolean;
  matchedByGenre: boolean;
}

export interface AssignAuthorOptions {
  genre: string;
  preferredAuthorId?: string | null;
  createIfNotFound?: boolean;
  useAI?: boolean; // Use AI for generating new authors (slower but better)
}

/**
 * Get or create an author for a story
 */
export async function assignAuthorToStory(
  options: AssignAuthorOptions
): Promise<AuthorAssignmentResult | null> {
  const {
    genre,
    preferredAuthorId,
    createIfNotFound = true,
    useAI = false,
  } = options;

  const supabase = getSupabase();

  // 1. If a specific author is requested, verify and use it
  if (preferredAuthorId) {
    const { data: author } = await supabase
      .from('ai_authors')
      .select('id, name')
      .eq('id', preferredAuthorId)
      .eq('status', 'active')
      .single();

    if (author) {
      return {
        authorId: author.id,
        authorName: author.name,
        isNewAuthor: false,
        matchedByGenre: false,
      };
    }
    // If preferred author not found, continue to find another
  }

  // 2. Find an active author that specializes in this genre
  const { data: genreAuthors } = await supabase
    .from('ai_authors')
    .select('id, name, specialized_genres')
    .eq('status', 'active')
    .contains('specialized_genres', [genre]);

  if (genreAuthors && genreAuthors.length > 0) {
    // Randomly select one to distribute stories
    const randomAuthor = genreAuthors[Math.floor(Math.random() * genreAuthors.length)];
    return {
      authorId: randomAuthor.id,
      authorName: randomAuthor.name,
      isNewAuthor: false,
      matchedByGenre: true,
    };
  }

  // 3. Find any active author (genre not matching)
  const { data: anyAuthors } = await supabase
    .from('ai_authors')
    .select('id, name')
    .eq('status', 'active')
    .limit(10);

  if (anyAuthors && anyAuthors.length > 0) {
    // Randomly select one
    const randomAuthor = anyAuthors[Math.floor(Math.random() * anyAuthors.length)];
    return {
      authorId: randomAuthor.id,
      authorName: randomAuthor.name,
      isNewAuthor: false,
      matchedByGenre: false,
    };
  }

  // 4. No authors found - create one if allowed
  if (!createIfNotFound) {
    return null;
  }

  let newAuthorData;

  if (useAI) {
    // Use AI to generate detailed author profile
    try {
      const generator = new AuthorGenerator('gemini', 'gemini-3-flash-preview');
      newAuthorData = await generator.generateAuthor({ genre });
    } catch (error) {

      newAuthorData = generateQuickAuthor(genre);
    }
  } else {
    // Quick generation without AI
    newAuthorData = generateQuickAuthor(genre);
  }

  // Save the new author
  const { data: savedAuthor, error: saveError } = await supabase
    .from('ai_authors')
    .insert({
      name: newAuthorData.name,
      bio: newAuthorData.bio,
      writing_style_description: newAuthorData.writing_style_description,
      ai_prompt_persona: newAuthorData.ai_prompt_persona,
      specialized_genres: newAuthorData.specialized_genres,
      status: 'active',
    })
    .select('id, name')
    .single();

  if (saveError || !savedAuthor) {
    console.error('Failed to create new author:', saveError);
    return null;
  }

  return {
    authorId: savedAuthor.id,
    authorName: savedAuthor.name,
    isNewAuthor: true,
    matchedByGenre: true,
  };
}

/**
 * Get statistics about author distribution
 */
export async function getAuthorStats(): Promise<{
  totalAuthors: number;
  activeAuthors: number;
  authorsByGenre: Record<string, number>;
  storiesPerAuthor: Array<{ authorId: string; authorName: string; storyCount: number }>;
}> {
  const supabase = getSupabase();

  // Get all authors
  const { data: authors } = await supabase
    .from('ai_authors')
    .select('id, name, status, specialized_genres');

  if (!authors) {
    return {
      totalAuthors: 0,
      activeAuthors: 0,
      authorsByGenre: {},
      storiesPerAuthor: [],
    };
  }

  // Count stories per author
  const { data: novels } = await supabase
    .from('novels')
    .select('ai_author_id')
    .not('ai_author_id', 'is', null);

  const storyCountMap = new Map<string, number>();
  if (novels) {
    for (const novel of novels) {
      if (novel.ai_author_id) {
        storyCountMap.set(novel.ai_author_id, (storyCountMap.get(novel.ai_author_id) || 0) + 1);
      }
    }
  }

  // Build genre distribution
  const authorsByGenre: Record<string, number> = {};
  for (const author of authors) {
    if (author.specialized_genres) {
      for (const genre of author.specialized_genres) {
        authorsByGenre[genre] = (authorsByGenre[genre] || 0) + 1;
      }
    }
  }

  return {
    totalAuthors: authors.length,
    activeAuthors: authors.filter(a => a.status === 'active').length,
    authorsByGenre,
    storiesPerAuthor: authors.map(a => ({
      authorId: a.id,
      authorName: a.name,
      storyCount: storyCountMap.get(a.id) || 0,
    })).sort((a, b) => b.storyCount - a.storyCount),
  };
}

/**
 * Balance author assignments - redistribute stories if some authors have too many
 * This is for display purposes only, does not actually reassign
 */
export async function suggestAuthorRebalance(): Promise<{
  shouldRebalance: boolean;
  reason?: string;
  suggestions: Array<{ fromAuthor: string; toAuthor: string; storyId: string }>;
}> {
  const stats = await getAuthorStats();

  if (stats.activeAuthors < 2) {
    return {
      shouldRebalance: false,
      reason: 'Not enough authors for rebalancing',
      suggestions: [],
    };
  }

  const avgStories = stats.storiesPerAuthor.reduce((sum, a) => sum + a.storyCount, 0) / stats.activeAuthors;
  const maxAllowed = Math.ceil(avgStories * 1.5); // 50% above average is threshold

  const overloadedAuthors = stats.storiesPerAuthor.filter(a => a.storyCount > maxAllowed);

  if (overloadedAuthors.length === 0) {
    return {
      shouldRebalance: false,
      suggestions: [],
    };
  }

  return {
    shouldRebalance: true,
    reason: `${overloadedAuthors.length} author(s) have more than ${maxAllowed} stories`,
    suggestions: [], // Would need to query novels to provide actual suggestions
  };
}

export { AuthorGenerator, generateQuickAuthor };
