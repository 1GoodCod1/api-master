import {
  sanitizeStrict,
  sanitizeBasic,
  sanitizeArray,
  sanitizeObject,
} from '../../../src/modules/shared/utils/sanitize-html.util';

describe('HTML Sanitization Utilities', () => {
  describe('sanitizeStrict', () => {
    it('escapes script tags', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    it('preserves safe text', () => {
      expect(sanitizeStrict('This is safe text')).toBe('This is safe text');
    });

    it('handles empty string', () => {
      expect(sanitizeStrict('')).toBe('');
    });

    it('handles null/undefined', () => {
      expect(sanitizeStrict(null as never)).toBe(null);
      expect(sanitizeStrict(undefined as never)).toBe(undefined);
    });
  });

  describe('sanitizeBasic', () => {
    it('allows basic formatting tags', () => {
      const input = '<b>Bold</b> <i>Italic</i>';
      const output = sanitizeBasic(input);
      expect(output).toContain('<b>');
      expect(output).toContain('<i>');
    });

    it('escapes script tags even in basic mode', () => {
      const input = '<b>Bold</b> <script>alert(1)</script>';
      const output = sanitizeBasic(input);
      expect(output).toContain('<b>');
      expect(output).not.toContain('<script>');
    });
  });

  describe('sanitizeArray', () => {
    it('sanitizes array of strings', () => {
      const input = ['<script>alert(1)</script>', 'Safe text'];
      const output = sanitizeArray(input, 'strict');
      expect(output[0]).toContain('&lt;script&gt;');
      expect(output[1]).toBe('Safe text');
    });

    it('handles empty array', () => {
      expect(sanitizeArray([])).toEqual([]);
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes object strings', () => {
      const input = {
        name: '<script>XSS</script>John',
        bio: 'Safe bio',
        age: 25,
      };
      const output = sanitizeObject(input, 'strict') as {
        name: string;
        bio: string;
        age: number;
      };
      expect(output.name).toContain('&lt;script&gt;');
      expect(output.bio).toBe('Safe bio');
      expect(output.age).toBe(25);
    });
  });
});
