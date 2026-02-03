/**
 * Validation Schema Unit Tests
 */

import {
  validateInput,
  ValidationError,
  UUIDSchema,
  GenreSchema,
  CreateProjectSchema,
  SubmitChapterSchema,
  PaginationSchema,
} from '@/lib/security/validation';

describe('ValidationSchemas', () => {
  describe('UUIDSchema', () => {
    it('should accept valid UUID', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(() => validateInput(UUIDSchema, validUUID)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      expect(() => validateInput(UUIDSchema, 'not-a-uuid')).toThrow(ValidationError);
    });

    it('should reject empty string', () => {
      expect(() => validateInput(UUIDSchema, '')).toThrow(ValidationError);
    });
  });

  describe('GenreSchema', () => {
    const validGenres = [
      'tien_hiep',
      'huyen_huyen',
      'do_thi',
      'khoa_huyen',
      'lich_su',
      'dong_nhan',
      'vong_du',
    ];

    it.each(validGenres)('should accept genre: %s', (genre) => {
      expect(() => validateInput(GenreSchema, genre)).not.toThrow();
    });

    it('should reject invalid genre', () => {
      expect(() => validateInput(GenreSchema, 'invalid_genre')).toThrow(ValidationError);
    });
  });

  describe('PaginationSchema', () => {
    it('should accept valid pagination', () => {
      const result = validateInput(PaginationSchema, { page: 1, limit: 20 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should use defaults when not provided', () => {
      const result = validateInput(PaginationSchema, {});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should reject page less than 1', () => {
      expect(() => validateInput(PaginationSchema, { page: 0 })).toThrow(ValidationError);
    });

    it('should reject limit greater than 100', () => {
      expect(() => validateInput(PaginationSchema, { limit: 200 })).toThrow(ValidationError);
    });
  });

  describe('CreateProjectSchema', () => {
    const validProject = {
      novelTitle: 'Test Novel',
      genre: 'tien_hiep',
      mainCharacter: 'Hero',
    };

    it('should accept valid project', () => {
      const result = validateInput(CreateProjectSchema, validProject);
      expect(result.novelTitle).toBe('Test Novel');
      expect(result.genre).toBe('tien_hiep');
    });

    it('should apply defaults', () => {
      const result = validateInput(CreateProjectSchema, validProject);
      expect(result.targetChapterLength).toBe(2500);
      expect(result.temperature).toBe(0.8);
      expect(result.totalPlannedChapters).toBe(100);
    });

    it('should reject missing required fields', () => {
      expect(() => validateInput(CreateProjectSchema, { novelTitle: 'Test' })).toThrow(ValidationError);
    });

    it('should reject invalid genre', () => {
      expect(() => validateInput(CreateProjectSchema, {
        ...validProject,
        genre: 'invalid',
      })).toThrow(ValidationError);
    });

    it('should reject too short title', () => {
      expect(() => validateInput(CreateProjectSchema, {
        ...validProject,
        novelTitle: '',
      })).toThrow(ValidationError);
    });

    it('should reject target length out of range', () => {
      expect(() => validateInput(CreateProjectSchema, {
        ...validProject,
        targetChapterLength: 100, // Too short
      })).toThrow(ValidationError);

      expect(() => validateInput(CreateProjectSchema, {
        ...validProject,
        targetChapterLength: 20000, // Too long
      })).toThrow(ValidationError);
    });
  });

  describe('SubmitChapterSchema', () => {
    const validChapter = {
      action: 'submit_chapter' as const,
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'A'.repeat(200), // At least 100 chars
    };

    it('should accept valid chapter submission', () => {
      const result = validateInput(SubmitChapterSchema, validChapter);
      expect(result.action).toBe('submit_chapter');
      expect(result.projectId).toBe(validChapter.projectId);
    });

    it('should reject content too short', () => {
      expect(() => validateInput(SubmitChapterSchema, {
        ...validChapter,
        content: 'Too short',
      })).toThrow(ValidationError);
    });

    it('should reject invalid projectId', () => {
      expect(() => validateInput(SubmitChapterSchema, {
        ...validChapter,
        projectId: 'invalid-uuid',
      })).toThrow(ValidationError);
    });

    it('should accept optional title', () => {
      const result = validateInput(SubmitChapterSchema, {
        ...validChapter,
        title: 'Chapter 1',
      });
      expect(result.title).toBe('Chapter 1');
    });
  });

  describe('ValidationError', () => {
    it('should include field details', () => {
      try {
        validateInput(CreateProjectSchema, { novelTitle: '' });
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationError = err as ValidationError;
        expect(validationError.errors.length).toBeGreaterThan(0);
        expect(validationError.errors[0]).toHaveProperty('field');
        expect(validationError.errors[0]).toHaveProperty('message');
      }
    });

    it('should serialize to JSON', () => {
      try {
        validateInput(UUIDSchema, 'invalid');
        fail('Should have thrown');
      } catch (err) {
        const validationError = err as ValidationError;
        const json = validationError.toJSON();
        expect(json).toHaveProperty('error');
        expect(json).toHaveProperty('details');
      }
    });
  });
});
