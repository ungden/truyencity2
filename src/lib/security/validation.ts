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
