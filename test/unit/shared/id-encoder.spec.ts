process.env.ID_ENCRYPTION_SECRET = 'test-encryption-secret-32chars!!';
import {
  encodeId,
  decodeId,
  isValidEncodedId,
} from '../../../src/modules/shared/utils/id-encoder';

describe('id-encoder', () => {
  describe('encodeId', () => {
    it('encodes id to URL-safe base64', () => {
      const encoded = encodeId('abc123');
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('produces different output for different input', () => {
      const a = encodeId('id1');
      const b = encodeId('id2');
      expect(a).not.toBe(b);
    });
  });

  describe('decodeId', () => {
    it('decodes encoded id back to original', () => {
      const original = 'user-123';
      const encoded = encodeId(original);
      const decoded = decodeId(encoded);
      expect(decoded).toBe(original);
    });

    it('returns null for invalid encoded string', () => {
      expect(decodeId('invalid!!!')).toBe(null);
      expect(decodeId('')).toBe(null);
      expect(decodeId('not-valid-base64!@#')).toBe(null);
    });
  });

  describe('isValidEncodedId', () => {
    it('returns true for valid encoded id', () => {
      const encoded = encodeId('id1');
      expect(isValidEncodedId(encoded)).toBe(true);
    });

    it('returns false for invalid string', () => {
      expect(isValidEncodedId('invalid')).toBe(false);
      expect(isValidEncodedId('')).toBe(false);
    });
  });
});
