/**
 * Input Validation Schemas - Using Zod for type-safe validation
 *
 * All API inputs should be validated before processing
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// AUTH & TOKEN SCHEMAS
// ============================================================================

export const CreateTokenSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(1).max(100).optional().default('API Token'),
});

export const RevokeTokenSchema = z.object({
  action: z.literal('revoke'),
  tokenId: UUIDSchema,
});

export const TokenActionSchema = z.discriminatedUnion('action', [
  CreateTokenSchema,
  RevokeTokenSchema,
]);

// ============================================================================
// AI WRITER PROJECT SCHEMAS
// ============================================================================

export const GenreSchema = z.enum([
  'tien_hiep',
  'huyen_huyen',
  'do_thi',
  'khoa_huyen',
  'lich_su',
  'dong_nhan',
  'vong_du',
]);

export const ProjectStatusSchema = z.enum(['active', 'paused', 'completed']);

export const CreateProjectSchema = z.object({
  novelId: UUIDSchema.optional(),
  novelTitle: z.string().min(1).max(200),
  genre: GenreSchema,
  mainCharacter: z.string().min(1).max(200),
  cultivationSystem: z.string().max(1000).optional(),
  magicSystem: z.string().max(1000).optional(),
  modernSetting: z.string().max(1000).optional(),
  techLevel: z.string().max(500).optional(),
  historicalPeriod: z.string().max(500).optional(),
  originalWork: z.string().max(500).optional(),
  gameSystem: z.string().max(1000).optional(),
  worldDescription: z.string().max(2000).optional(),
  writingStyle: z.string().max(500).default('sinh động, hấp dẫn'),
  targetChapterLength: z.number().int().min(500).max(10000).default(2500),
  aiModel: z.string().default('gemini-3-flash-preview'),
  temperature: z.number().min(0).max(2).default(0.8),
  totalPlannedChapters: z.number().int().min(1).max(5000).default(100),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  id: UUIDSchema,
  status: ProjectStatusSchema.optional(),
});

// ============================================================================
// CHAPTER SUBMISSION SCHEMAS
// ============================================================================

export const SubmitChapterSchema = z.object({
  action: z.literal('submit_chapter'),
  projectId: UUIDSchema,
  title: z.string().max(200).optional(),
  content: z.string().min(100).max(100000), // Min 100 chars, max 100k
  chapterNumber: z.number().int().positive().optional(),
});

export const GetPromptSchema = z.object({
  action: z.literal('get_prompt'),
  projectId: UUIDSchema,
});

export const ExternalAPISchema = z.discriminatedUnion('action', [
  SubmitChapterSchema,
  GetPromptSchema,
]);

// ============================================================================
// JOB & SCHEDULE SCHEMAS
// ============================================================================

export const CreateJobSchema = z.object({
  projectId: UUIDSchema,
  chaptersToWrite: z.number().int().min(1).max(100).default(1),
});

export const ScheduleFrequencySchema = z.enum([
  'hourly',
  'daily',
  'twice_daily',
  'weekly',
]);

export const CreateScheduleSchema = z.object({
  projectId: UUIDSchema,
  frequency: ScheduleFrequencySchema,
  chaptersPerRun: z.number().int().min(1).max(10).default(1),
  maxChaptersPerDay: z.number().int().min(1).max(50).default(10),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
});

// ============================================================================
// STORY INSPIRATION SCHEMAS
// ============================================================================

export const StoryInspirationSchema = z.object({
  title: z.string().min(1).max(200),
  sourceType: z.enum(['file', 'text', 'url']),
  content: z.string().max(500000).optional(), // Max 500k chars
  fileUrl: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
});

// ============================================================================
// SUBSCRIPTION & BILLING SCHEMAS (NEW)
// ============================================================================

export const SubscriptionTierSchema = z.enum(['free', 'creator', 'pro', 'enterprise']);

export const CreateSubscriptionSchema = z.object({
  tier: SubscriptionTierSchema,
  paymentMethod: z.enum(['stripe', 'vnpay', 'momo']).optional(),
});

export const CreditPurchaseSchema = z.object({
  creditAmount: z.number().int().min(10).max(10000),
  paymentMethod: z.enum(['stripe', 'vnpay', 'momo']),
});

// ============================================================================
// CLAUDE WRITER SCHEMAS
// ============================================================================

const WriterConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  targetWordCount: z.number().int().min(500).max(10000).optional(),
}).optional();

export const WriterActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('write_chapter'),
    projectId: UUIDSchema,
    customPrompt: z.string().max(2000).optional(),
    config: WriterConfigSchema,
  }),
  z.object({
    action: z.literal('write_batch'),
    projectId: UUIDSchema,
    chapterCount: z.number().int().min(1).max(20).default(1),
    customPrompt: z.string().max(2000).optional(),
    config: WriterConfigSchema,
  }),
  z.object({
    action: z.literal('get_status'),
    projectId: UUIDSchema,
  }),
]);

// ============================================================================
// RATINGS SCHEMAS
// ============================================================================

export const RatingSubmitSchema = z.object({
  novel_id: UUIDSchema,
  score: z.number().int().min(1).max(5),
});

// ============================================================================
// NOVELS SCHEMAS
// ============================================================================

export const CreateNovelSchema = z.object({
  title: z.string().min(1).max(500),
  ai_author_id: UUIDSchema,
  description: z.string().max(5000).optional(),
  status: z.string().default('Đang ra'),
  genres: z.array(z.string()).min(1),
  cover_url: z.string().url().optional().nullable(),
});

// ============================================================================
// AI IMAGE SCHEMAS
// ============================================================================

export const AIImageJobSchema = z.object({
  prompt: z.string().min(1).max(2000),
  novelId: UUIDSchema.optional().nullable(),
});

// ============================================================================
// AI AUTHOR SCHEMAS
// ============================================================================

export const AIAuthorGenerateSchema = z.object({
  genre: z.string().default('tien-hiep'),
  style: z.enum(['traditional', 'modern', 'mixed']).default('mixed'),
  gender: z.enum(['male', 'female', 'neutral']).default('neutral'),
  age_group: z.enum(['young', 'middle', 'senior']).default('middle'),
  use_ai: z.boolean().default(true),
  save_to_db: z.boolean().default(false),
});

export const AIAuthorBatchSchema = z.object({
  count: z.number().int().min(1).max(10).default(5),
  genres: z.array(z.string()).default(['tien-hiep', 'huyen-huyen', 'do-thi']),
  save_to_db: z.boolean().default(false),
});

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

export const ExportNovelSchema = z.object({
  novelId: UUIDSchema,
  format: z.enum(['txt', 'epub', 'pdf']),
  chapters: z.array(z.number().int()).optional(),
  includeMetadata: z.boolean().default(true),
  includeCover: z.boolean().default(true),
  title: z.string().optional(),
  author: z.string().optional(),
});

// ============================================================================
// BILLING ACTION SCHEMAS
// ============================================================================

export const CreditActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('purchase'),
    packageId: z.string().min(1),
    paymentMethod: z.enum(['stripe', 'vnpay', 'momo']),
    paymentProviderId: z.string().min(1),
  }),
  z.object({
    action: z.literal('consume'),
    chapterId: UUIDSchema,
    wordCount: z.number().int().positive(),
  }),
]);

export const SubscriptionActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('upgrade'),
    tier: SubscriptionTierSchema,
    paymentInfo: z.record(z.unknown()).optional(),
  }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal('check_write'),
  }),
]);

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and parse input with Zod schema
 * Throws formatted error message if validation fails
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    throw new ValidationError('Validation failed', errors);
  }

  return result.data;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      error: this.message,
      details: this.errors,
    };
  }
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(error: ValidationError): Response {
  return new Response(JSON.stringify(error.toJSON()), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Safe validation wrapper that returns null instead of throwing
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
