import { SetMetadata } from '@nestjs/common';

/** Ключ метаданных: маршрут без обязательной аутентификации. */
export const IS_PUBLIC_KEY = 'isPublic';

/** Помечает эндпоинт как публичный (обход JWT-guard при поддержке в guard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
