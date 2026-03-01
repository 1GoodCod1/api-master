import { Prisma } from '@prisma/client';
import {
  decimalToNumber,
  isDecimal,
} from '../../../src/modules/shared/utils/decimal.utils';

describe('decimal.utils', () => {
  describe('decimalToNumber', () => {
    it('returns 0 for null', () => {
      expect(decimalToNumber(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(decimalToNumber(undefined)).toBe(0);
    });

    it('returns number as-is when passed number', () => {
      expect(decimalToNumber(42)).toBe(42);
      expect(decimalToNumber(0)).toBe(0);
      expect(decimalToNumber(-3.14)).toBe(-3.14);
    });

    it('converts Prisma.Decimal to number', () => {
      const decimal = new Prisma.Decimal(99.99);
      expect(decimalToNumber(decimal)).toBe(99.99);
    });
  });

  describe('isDecimal', () => {
    it('returns true for Prisma.Decimal', () => {
      expect(isDecimal(new Prisma.Decimal(1))).toBe(true);
    });

    it('returns false for number', () => {
      expect(isDecimal(42)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isDecimal('42')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isDecimal(null)).toBe(false);
    });
  });
});
