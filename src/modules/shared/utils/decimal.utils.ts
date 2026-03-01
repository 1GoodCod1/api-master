import { Prisma } from '@prisma/client';

export function decimalToNumber(
  value: Prisma.Decimal | number | null | undefined,
): number {
  if (!value) return 0;

  if (typeof value === 'number') {
    return value;
  }

  // Для Prisma.Decimal
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return Number(value) || 0;
}

export function isDecimal(value: any): value is Prisma.Decimal {
  return value instanceof Prisma.Decimal;
}
