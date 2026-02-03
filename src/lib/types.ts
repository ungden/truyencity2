import * as z from 'zod';

// Novel Schema
export const novelSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  // Đổi sang tham chiếu tác giả nội bộ theo id (bắt buộc)
  ai_author_id: z.string().uuid('Tác giả AI không hợp lệ'),
  // Giữ lại author (tên hiển thị) để tương thích UI hiện tại
  author: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  genres: z
    .array(z.string())
    .min(1, 'Vui lòng chọn thể loại'),
  cover_url: z.string().url('URL ảnh bìa không hợp lệ').optional().or(z.literal('')),
  owner_id: z.string().uuid('Tài khoản tác giả không hợp lệ').optional(),
});

// Form uses the schema INPUT (before transforms) for resolver compatibility
export type NovelFormValues = z.input<typeof novelSchema>;

export type Novel = {
  id: string;
  title: string;
  // giữ lại author để hiển thị, nhưng nguồn chân lý là ai_author_id
  author?: string | null;
  ai_author_id?: string | null;
  cover_url?: string | null;
  description?: string | null;
  status?: string | null;
  genres?: string[] | null;
  owner_id?: string | null;
  created_at: string;
};

// Chapter Schema
export const chapterSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  chapter_number: z.coerce.number().int().positive('Số chương phải là số nguyên dương'),
  content: z.string().optional(),
});

export type ChapterFormValues = z.infer<typeof chapterSchema>;
export type Chapter = {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content?: string | null;
  created_at: string;
};

// AI Author Schema
export const authorSchema = z.object({
  name: z.string().min(1, 'Bút danh không được để trống'),
  bio: z.string().optional(),
  avatar_url: z.string().url('URL avatar không hợp lệ').optional().or(z.literal('')),
  writing_style_description: z.string().optional(),
  ai_prompt_persona: z.string().min(1, 'Prompt "nhập vai" không được để trống'),
  specialized_genres: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']),
});

export type AuthorFormValues = z.infer<typeof authorSchema>;
export type Author = {
  id: string;
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
  writing_style_description?: string | null;
  ai_prompt_persona: string;
  specialized_genres?: string[] | null;
  status: 'active' | 'inactive';
  created_at: string;
};