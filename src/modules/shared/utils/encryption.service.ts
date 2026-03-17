import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly encryptionKeyPromise: Promise<Buffer>;

  constructor(private readonly configService: ConfigService) {
    let key = this.configService.get<string>('ENCRYPTION_KEY');

    if (!key) {
      const nodeEnv = this.configService.get<string>('NODE_ENV');
      if (nodeEnv === 'production') {
        throw new Error('ENCRYPTION_KEY is not set in environment variables');
      }
      console.warn(
        '⚠️ WARNING: Using default ENCRYPTION_KEY for development. DO NOT USE IN PRODUCTION!',
      );
      key = 'development-key-change-this-in-production-32chars-minimum';
    }

    this.encryptionKeyPromise = scryptAsync(
      key,
      'salt',
      this.keyLength,
    ) as Promise<Buffer>;
  }

  /**
   * Зашифровать текст
   */
  async encrypt(text: string): Promise<string> {
    if (!text) return text;

    try {
      const encryptionKey = await this.encryptionKeyPromise;
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Возвращаем IV + AuthTag + зашифрованные данные
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Расшифровать текст
   */
  async decrypt(encryptedText: string): Promise<string> {
    if (!encryptedText) return encryptedText;

    try {
      const encryptionKey = await this.encryptionKeyPromise;
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Хэшировать данные (необратимо)
   */
  hash(text: string): string {
    if (text == null || typeof text !== 'string') {
      throw new TypeError('hash() requires a string, received ' + typeof text);
    }
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Маскировать телефон для отображения
   */
  maskPhone(phone: string): string {
    if (!phone || phone.length < 8) return phone;

    // Показываем первые 3 и последние 2 цифры
    const visibleStart = phone.substring(0, 3);
    const visibleEnd = phone.substring(phone.length - 2);
    const masked = '*'.repeat(phone.length - 5);

    return `${visibleStart}${masked}${visibleEnd}`;
  }

  /**
   * Генерировать случайный код
   */
  generateCode(length: number = 6): string {
    const digits = '0123456789';
    let code = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      code += digits[randomIndex];
    }

    return code;
  }

  /**
   * Генерировать случайный токен
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
