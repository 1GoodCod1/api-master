import { Prisma } from '@prisma/client';
export declare function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number;
export declare function isDecimal(value: any): value is Prisma.Decimal;
