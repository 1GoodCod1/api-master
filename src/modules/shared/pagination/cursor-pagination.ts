/**
 * Universal cursor-based pagination helpers.
 *
 * Supports any Prisma model that has `id` (string) and `createdAt` (Date).
 * The cursor is an opaque, URL-safe, base64url-encoded JSON token.
 *
 * This module provides:
 * - `encodeCursor` / `decodeCursor` — low-level token operations
 * - `applyCursorToWhere` — builds a Prisma `where` clause that efficiently
 *    skips records already seen by the client
 * - `buildPaginatedResponse` — constructs the standardised pagination meta
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CursorPayload {
  /** ISO-8601 timestamp of the last item the client received */
  createdAt: string;
  /** Primary ID of that item (tie-breaker for rows with identical createdAt) */
  id: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  /** null when no more pages */
  nextCursor: string | null;
  /** Previous cursor for bi-directional paging (optional) */
  prevCursor?: string | null;
  /** For backwards-compat: current page (cursor mode always uses 1) */
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Encode / Decode
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
// Build WHERE clause
// ---------------------------------------------------------------------------

/**
 * Applies a cursor to an existing Prisma `where` clause.
 *
 * For **DESC** ordering (default — newest first):
 *   `(createdAt < cursor.createdAt) OR (createdAt = cursor.createdAt AND id < cursor.id)`
 *
 * For **ASC** ordering (oldest first):
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
// Build paginated response
// ---------------------------------------------------------------------------

/**
 * Constructs a standardised paginated response.
 *
 * The caller should fetch `limit + 1` items from the DB.
 * If we receive more items than `limit`, the extra item proves that more
 * data exists and is used to derive `nextCursor`.
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
// Order-by helper
// ---------------------------------------------------------------------------

/**
 * Returns the standard order-by array for cursor pagination.
 * Always includes `id` as a tie-breaker.
 */
export function cursorOrderBy(
  order: 'asc' | 'desc' = 'desc',
): Array<Record<string, 'asc' | 'desc'>> {
  return [{ createdAt: order }, { id: order }];
}

// ---------------------------------------------------------------------------
// Convenience: build the Prisma query params
// ---------------------------------------------------------------------------

export interface CursorQueryParams {
  where: Record<string, unknown>;
  orderBy: Array<Record<string, 'asc' | 'desc'>>;
  take: number;
  skip?: number;
}

/**
 * All-in-one helper: given base `where`, raw `cursor` token, page, limit —
 * returns the Prisma query params to use.
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
    // Fetch limit+1 to determine hasMore
    return { where, orderBy, take: limit + 1, usedCursor };
  }

  // Offset-based fallback for first page or when no cursor
  const pageNum = Math.max(1, Number(page) || 1);
  return {
    where,
    orderBy,
    take: limit + 1,
    skip: (pageNum - 1) * limit,
    usedCursor: false,
  };
}
