/**
 * Validation Schema Unit Tests
 */

import {
  validateInput,
  ValidationError,
  UUIDSchema,
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

  describe('ValidationError', () => {
    it('should include field details', () => {
      try {
        validateInput(UUIDSchema, 'invalid');
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
