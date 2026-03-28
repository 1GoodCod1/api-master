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

export interface CursorQueryParams {
  where: Record<string, unknown>;
  orderBy: Array<Record<string, 'asc' | 'desc'>>;
  take: number;
  skip?: number;
}
