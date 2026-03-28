/**
 * Универсальная курсорная пагинация.
 *
 * Подходит для моделей Prisma с `id` (string) и `createdAt` (Date).
 * Курсор — непрозрачный URL-safe base64url JSON.
 *
 * Модуль даёт:
 * - encodeCursor / decodeCursor — низкоуровневые операции с токеном
 * - applyCursorToWhere — условие Prisma `where` для пропуска уже отданных строк
 * - buildPaginatedResponse — стандартизированная meta пагинации
 */

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------

export interface CursorPayload {
  /** ISO-8601 последнего отданного клиенту элемента */
  createdAt: string;
  /** ID того же элемента (развязка при одинаковом createdAt) */
  id: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  /** null, если страниц больше нет */
  nextCursor: string | null;
  /** Предыдущий курсор для двунаправленной пагинации (опционально) */
  prevCursor?: string | null;
  /** Совместимость: номер страницы (в режиме курсора часто 1) */
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Кодирование / декодирование
// ---------------------------------------------------------------------------

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(
  token: string | null | undefined,
): CursorPayload | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.createdAt !== 'string' || typeof obj.id !== 'string')
      return null;
    const dt = new Date(obj.createdAt);
    if (Number.isNaN(dt.getTime())) return null;
    return { createdAt: obj.createdAt, id: obj.id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Условие WHERE
// ---------------------------------------------------------------------------

/**
 * Добавляет курсор к существующему Prisma `where`.
 *
 * Сортировка **DESC** (по умолчанию — сначала новые):
 *   `(createdAt < cursor.createdAt) OR (createdAt = cursor.createdAt AND id < cursor.id)`
 *
 * Сортировка **ASC** (сначала старые):
 *   `(createdAt > cursor.createdAt) OR (createdAt = cursor.createdAt AND id > cursor.id)`
 */
export function applyCursorToWhere<TWhere extends Record<string, unknown>>(
  where: TWhere,
  cursor: CursorPayload,
  order: 'asc' | 'desc' = 'desc',
): TWhere {
  const dt = new Date(cursor.createdAt);
  const comparator = order === 'desc' ? 'lt' : 'gt';

  return {
    AND: [
      where,
      {
        OR: [
          { createdAt: { [comparator]: dt } },
          { createdAt: dt, id: { [comparator]: cursor.id } },
        ],
      },
    ],
  } as unknown as TWhere;
}

// ---------------------------------------------------------------------------
// Ответ с пагинацией
// ---------------------------------------------------------------------------

/**
 * Собирает стандартный ответ с пагинацией.
 *
 * Запрос в БД: `limit + 1` строк.
 * Если строк больше `limit`, лишняя показывает наличие следующей страницы и даёт `nextCursor`.
 */
export function buildPaginatedResponse<
  T extends { id: string; createdAt: Date },
>(
  rawItems: T[],
  total: number,
  limit: number,
  usedCursor: boolean,
): PaginatedResult<T> {
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;

  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem
      ? encodeCursor({
          id: lastItem.id,
          createdAt: lastItem.createdAt.toISOString(),
        })
      : null;

  return {
    items,
    meta: {
      total,
      limit,
      nextCursor,
      page: usedCursor ? 1 : 1,
      totalPages: Math.ceil(total / limit),
      hasMore,
    },
  };
}

// ---------------------------------------------------------------------------
// Сортировка
// ---------------------------------------------------------------------------

/**
 * Стандартный orderBy для курсорной пагинации.
 * Всегда включает `id` как развязку.
 */
export function cursorOrderBy(
  order: 'asc' | 'desc' = 'desc',
): Array<Record<string, 'asc' | 'desc'>> {
  return [{ createdAt: order }, { id: order }];
}

// ---------------------------------------------------------------------------
// Сборка параметров запроса Prisma
// ---------------------------------------------------------------------------

export interface CursorQueryParams {
  where: Record<string, unknown>;
  orderBy: Array<Record<string, 'asc' | 'desc'>>;
  take: number;
  skip?: number;
}

/**
 * Сводный хелпер: base `where`, токен `cursor`, page, limit → параметры Prisma.
 */
export function buildCursorQuery(
  baseWhere: Record<string, unknown>,
  cursor: string | null | undefined,
  page: number | undefined,
  limit: number,
  order: 'asc' | 'desc' = 'desc',
): CursorQueryParams & { usedCursor: boolean } {
  const decoded = decodeCursor(cursor);
  const usedCursor = Boolean(cursor && decoded);

  const where = usedCursor
    ? applyCursorToWhere(baseWhere, decoded!, order)
    : baseWhere;

  const orderBy = cursorOrderBy(order);

  if (usedCursor) {
    // Берём limit+1, чтобы узнать hasMore
    return { where, orderBy, take: limit + 1, usedCursor };
  }

  // Первая страница или без курсора — offset
  const pageNum = Math.max(1, Number(page) || 1);
  return {
    where,
    orderBy,
    take: limit + 1,
    skip: (pageNum - 1) * limit,
    usedCursor: false,
  };
}
