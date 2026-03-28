import { SetMetadata } from '@nestjs/common';

/** Ключ метаданных для проверки верификации мастера. */
export const VERIFIED_KEY = 'verified';

/** Требовать подтверждённый профиль (`required` по умолчанию true). */
export const Verified = (required: boolean = true) =>
  SetMetadata(VERIFIED_KEY, required);
