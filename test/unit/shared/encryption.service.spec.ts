import { EncryptionService } from '../../../src/modules/shared/utils/encryption.service';
import type { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'ENCRYPTION_KEY')
        return 'test-key-at-least-32-characters-long';
      return undefined;
    }),
  } as unknown as jest.Mocked<ConfigService>;

  let service: EncryptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EncryptionService(configService);
  });

  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts text correctly', async () => {
      const text = 'sensitive-data-123';
      const encrypted = await service.encrypt(text);
      const decrypted = await service.decrypt(encrypted);
      expect(decrypted).toBe(text);
      expect(encrypted).not.toBe(text);
    });

    it('returns empty string for empty input', async () => {
      expect(await service.encrypt('')).toBe('');
      expect(await service.decrypt('')).toBe('');
    });

    it('throws for invalid encrypted format', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.decrypt('invalid')).rejects.toThrow(
        'Failed to decrypt data',
      );
      await expect(service.decrypt('a:b')).rejects.toThrow();

      spy.mockRestore();
    });
  });

  describe('hash', () => {
    it('hashes string consistently', () => {
      const hash1 = service.hash('password');
      const hash2 = service.hash('password');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]+$/);
    });

    it('throws for non-string', () => {
      expect(() => service.hash(null as never)).toThrow();
      expect(() => service.hash(123 as never)).toThrow();
    });
  });

  describe('maskPhone', () => {
    it('masks phone showing first 3 and last 2 digits', () => {
      const result = service.maskPhone('+37312345678');
      expect(result).toMatch(/^\+\d{2}\*+\d{2}$/);
      expect(result).toContain('*');
    });

    it('returns short phone as-is', () => {
      expect(service.maskPhone('123')).toBe('123');
    });
  });

  describe('generateCode', () => {
    it('generates code of specified length', () => {
      const code = service.generateCode(6);
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d+$/);
    });
  });

  describe('generateToken', () => {
    it('generates hex token', () => {
      const token = service.generateToken(16);
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });
});
