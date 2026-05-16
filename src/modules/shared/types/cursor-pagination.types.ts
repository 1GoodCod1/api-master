export interface CursorPayload {
  createdAt: string;
  id: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  nextCursor: string | null;
  prevCursor?: string | null;
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
