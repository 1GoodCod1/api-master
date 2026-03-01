import {
  validateSlug,
  validateUUID,
  validateCUID,
  validateId,
  sanitizeParam,
  validateParamArray,
} from '../../../src/modules/shared/utils/slug-validator.util';

describe('slug-validator.util', () => {
  describe('validateSlug', () => {
    it('returns slug for valid input', () => {
      expect(validateSlug('john-doe-plumber')).toBe('john-doe-plumber');
      expect(validateSlug('category_123')).toBe('category_123');
      expect(validateSlug('кириллица-123')).toBe('кириллица-123');
    });

    it('returns null for invalid input', () => {
      expect(validateSlug('john<script>')).toBe(null);
      expect(validateSlug('../../../etc')).toBe(null);
      expect(validateSlug('')).toBe(null);
      expect(validateSlug(null)).toBe(null);
      expect(validateSlug(undefined)).toBe(null);
    });

    it('returns null for path traversal', () => {
      expect(validateSlug('..')).toBe(null);
      expect(validateSlug('./file')).toBe(null);
    });
  });

  describe('validateUUID', () => {
    it('returns true for valid UUID v4', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('returns false for invalid', () => {
      expect(validateUUID('invalid')).toBe(false);
      expect(validateUUID('')).toBe(false);
      expect(validateUUID(null)).toBe(false);
    });
  });

  describe('validateCUID', () => {
    it('returns true for valid CUID', () => {
      expect(validateCUID('cjld2cjxh0000qzrmn831i7rn')).toBe(true);
    });

    it('returns false for invalid', () => {
      expect(validateCUID('short')).toBe(false);
      expect(validateCUID('')).toBe(false);
    });
  });

  describe('validateId', () => {
    it('returns true for UUID, CUID, or numeric', () => {
      expect(validateId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateId('cjld2cjxh0000qzrmn831i7rn')).toBe(true);
      expect(validateId('12345')).toBe(true);
    });

    it('returns false for XSS attempts', () => {
      expect(validateId('<script>')).toBe(false);
      expect(validateId('')).toBe(false);
    });
  });

  describe('sanitizeParam', () => {
    it('returns sanitized slug for type slug', () => {
      expect(sanitizeParam('hello-world', 'slug')).toBe('hello-world');
    });

    it('throws for invalid slug', () => {
      expect(() => sanitizeParam('<script>', 'slug')).toThrow();
    });

    it('returns id for valid id type', () => {
      expect(sanitizeParam('123', 'id')).toBe('123');
    });
  });

  describe('validateParamArray', () => {
    it('filters valid ids', () => {
      const result = validateParamArray(['123', '<script>', '456'], 'id');
      expect(result).toEqual(['123', '456']);
    });
  });
});
