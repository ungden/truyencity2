// Re-export shared types from web
// These are pure TypeScript/Zod - fully portable

export type Novel = {
  id: string;
  title: string;
  slug?: string | null;
  author?: string | null;
  ai_author_id?: string | null;
  cover_url?: string | null;
  description?: string | null;
  status?: string | null;
  genres?: string[] | null;
  owner_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  chapters?: { count: number }[] | null;
  rating?: number | null;
  view_count?: number | null;
};

export type Chapter = {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content?: string | null;
  created_at: string;
};

export type Author = {
  id: string;
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
  writing_style_description?: string | null;
  ai_prompt_persona: string;
  specialized_genres?: string[] | null;
  status: "active" | "inactive";
  created_at: string;
};
