/* eslint-disable @typescript-eslint/no-unsafe-argument -- Test payloads use intentional any */
import {
  sanitizeStrict,
  sanitizeBasic,
  sanitizeArray,
  sanitizeObject,
} from '../src/modules/shared/utils/sanitize-html.util';

describe('HTML Sanitization Utilities', () => {
  describe('sanitizeStrict', () => {
    it('should escape script tags', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    it('should escape img with onerror', () => {
      const input = '<img src=x onerror=alert("XSS")>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('onerror');
      expect(output).toContain('&lt;img');
    });

    it('should escape iframe tags', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('<iframe');
      expect(output).toContain('&lt;iframe');
    });

    it('should escape style tags', () => {
      const input = '<style>body{display:none}</style>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('<style>');
      expect(output).toContain('&lt;style&gt;');
    });

    it('should remove all HTML tags', () => {
      const input = '<div><b>Bold</b> <i>Italic</i></div>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('<div>');
      expect(output).not.toContain('<b>');
      expect(output).not.toContain('<i>');
    });

    it('should preserve safe text', () => {
      const input = 'This is safe text';
      const output = sanitizeStrict(input);
      expect(output).toBe('This is safe text');
    });

    it('should handle empty string', () => {
      const input = '';
      const output = sanitizeStrict(input);
      expect(output).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeStrict(null as any)).toBe(null);
      expect(sanitizeStrict(undefined as any)).toBe(undefined);
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const output = sanitizeStrict(input);
      expect(output).toBe('Hello World');
    });

    it('should escape multiple script attempts', () => {
      const input = '<script>alert(1)</script><script>alert(2)</script>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('<script>');
    });

    it('should escape event handlers in attributes', () => {
      const input = '<a href="#" onclick="alert(1)">Click</a>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('onclick');
      expect(output).not.toContain('<a');
    });

    it('should escape svg XSS attempts', () => {
      const input = '<svg/onload=alert(1)>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('onload');
      expect(output).not.toContain('<svg');
    });

    it('should escape data URIs', () => {
      const input =
        '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const output = sanitizeStrict(input);
      expect(output).not.toContain('<a');
      expect(output).not.toContain('data:');
    });
  });

  describe('sanitizeBasic', () => {
    it('should allow basic formatting tags', () => {
      const input = '<b>Bold</b> <i>Italic</i>';
      const output = sanitizeBasic(input);
      expect(output).toContain('<b>');
      expect(output).toContain('<i>');
    });

    it('should escape script tags even in basic mode', () => {
      const input = '<b>Bold</b> <script>alert(1)</script>';
      const output = sanitizeBasic(input);
      expect(output).toContain('<b>');
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    it('should escape dangerous tags', () => {
      const input = '<iframe src="evil"></iframe>';
      const output = sanitizeBasic(input);
      expect(output).not.toContain('<iframe');
      expect(output).toContain('&lt;iframe');
    });

    it('should allow paragraph and line breaks', () => {
      const input = '<p>Paragraph</p><br/>';
      const output = sanitizeBasic(input);
      expect(output).toContain('<p>');
      expect(output).toContain('<br');
    });
  });

  describe('sanitizeArray', () => {
    it('should sanitize array of strings', () => {
      const input = ['<script>alert(1)</script>', 'Safe text', '<img src=x>'];
      const output = sanitizeArray(input, 'strict');
      expect(output[0]).toContain('&lt;script&gt;');
      expect(output[1]).toBe('Safe text');
      expect(output[2]).toContain('&lt;img');
    });

    it('should handle empty array', () => {
      const input: string[] = [];
      const output = sanitizeArray(input);
      expect(output).toEqual([]);
    });

    it('should preserve non-string values', () => {
      const input = ['text', 123 as any, null as any];
      const output = sanitizeArray(input);
      expect(output[0]).toBe('text');
      expect(output[1]).toBe(123);
      expect(output[2]).toBe(null);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize object strings', () => {
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

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<script>alert(1)</script>',
          profile: {
            bio: '<img src=x onerror=alert(1)>',
          },
        },
      };
      const output = sanitizeObject(input, 'strict') as {
        user: { name: string; profile: { bio: string } };
      };
      expect(output.user.name).toContain('&lt;script&gt;');
      expect(output.user.profile.bio).toContain('&lt;img');
    });

    it('should handle arrays in objects', () => {
      const input = {
        tags: ['<script>alert(1)</script>', 'safe'],
      };
      const output = sanitizeObject(input, 'strict') as { tags: string[] };
      expect(output.tags[0]).toContain('&lt;script&gt;');
      expect(output.tags[1]).toBe('safe');
    });

    it('should preserve null and undefined', () => {
      const input = {
        name: 'John',
        optional: null,
        missing: undefined,
      };
      const output = sanitizeObject(input) as {
        name: string;
        optional: null;
        missing: undefined;
      };
      expect(output.name).toBe('John');
      expect(output.optional).toBe(null);
      expect(output.missing).toBe(undefined);
    });
  });

  describe('Real-world XSS attack vectors', () => {
    const xssPayloads = [
      '<script>alert(String.fromCharCode(88,83,83))</script>',
      '<img src=x onerror=alert(1)>',
      '<svg/onload=alert(1)>',
      '<iframe src=javascript:alert(1)>',
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
      '<select onfocus=alert(1) autofocus>',
      '<textarea onfocus=alert(1) autofocus>',
      '<marquee onstart=alert(1)>',
      '<div style="background:url(javascript:alert(1))">',
      '"><script>alert(1)</script>',
      "'-alert(1)-'",
      '<a href="javascript:alert(1)">Click</a>',
    ];

    it.each(xssPayloads)('should sanitize XSS payload: %s', (payload) => {
      const output = sanitizeStrict(payload);
      expect(output).not.toContain('<script');
      expect(output).not.toContain('javascript:');
      expect(output).not.toContain('onerror');
      expect(output).not.toContain('onload');
      expect(output).not.toContain('onfocus');
    });
  });

  describe('Performance', () => {
    it('should handle large strings efficiently', () => {
      const largeString = '<script>alert(1)</script>'.repeat(1000);
      const start = Date.now();
      sanitizeStrict(largeString);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle deeply nested objects', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                xss: '<script>alert(1)</script>',
              },
            },
          },
        },
      };
      const output = sanitizeObject(deepObject) as {
        level1: { level2: { level3: { level4: { xss: string } } } };
      };
      expect(output.level1.level2.level3.level4.xss).toContain(
        '&lt;script&gt;',
      );
    });
  });
});
