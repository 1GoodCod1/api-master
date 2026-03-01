import {
  encodeCursor,
  decodeCursor,
  applyCursorToWhere,
  buildPaginatedResponse,
  cursorOrderBy,
  buildCursorQuery,
} from '../../../src/modules/shared/pagination/cursor-pagination';

describe('cursor-pagination', () => {
  describe('encodeCursor/decodeCursor', () => {
    it('encodes and decodes cursor', () => {
      const payload = { id: 'item1', createdAt: '2024-01-01T00:00:00.000Z' };
      const encoded = encodeCursor(payload);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(payload);
    });

    it('returns null for invalid cursor', () => {
      expect(decodeCursor(null)).toBe(null);
      expect(decodeCursor('')).toBe(null);
      expect(decodeCursor('invalid-base64!!!')).toBe(null);
    });
  });

  describe('applyCursorToWhere', () => {
    it('builds where clause for desc order', () => {
      const where = { status: 'active' };
      const cursor = { id: 'i1', createdAt: '2024-01-01T00:00:00.000Z' };
      const result = applyCursorToWhere(where, cursor, 'desc');
      expect(result).toHaveProperty('AND');
      expect((result as unknown as { AND: unknown[] }).AND[0]).toEqual(where);
    });

    it('builds where clause for asc order', () => {
      const where = { masterId: 'm1' };
      const cursor = { id: 'i1', createdAt: '2024-01-01T00:00:00.000Z' };
      const result = applyCursorToWhere(where, cursor, 'asc');
      expect(result).toHaveProperty('AND');
    });
  });

  describe('buildPaginatedResponse', () => {
    it('returns items and meta with hasMore when more than limit', () => {
      const items = [
        { id: 'i1', createdAt: new Date() },
        { id: 'i2', createdAt: new Date() },
        { id: 'i3', createdAt: new Date() },
      ];
      const result = buildPaginatedResponse(items, 10, 2, false);
      expect(result.items).toHaveLength(2);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBeTruthy();
      expect(result.meta.total).toBe(10);
    });

    it('returns all items when not exceeding limit', () => {
      const items = [
        { id: 'i1', createdAt: new Date() },
        { id: 'i2', createdAt: new Date() },
      ];
      const result = buildPaginatedResponse(items, 2, 10, false);
      expect(result.items).toHaveLength(2);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBe(null);
    });
  });

  describe('cursorOrderBy', () => {
    it('returns order-by for desc', () => {
      const result = cursorOrderBy('desc');
      expect(result).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    });

    it('returns order-by for asc', () => {
      const result = cursorOrderBy('asc');
      expect(result).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    });
  });

  describe('buildCursorQuery', () => {
    it('returns offset-based params when no cursor', () => {
      const result = buildCursorQuery({ status: 'active' }, null, 2, 20);
      expect(result.skip).toBe(20);
      expect(result.take).toBe(21);
      expect(result.usedCursor).toBe(false);
    });

    it('returns cursor-based params when valid cursor', () => {
      const cursor = encodeCursor({
        id: 'i1',
        createdAt: new Date().toISOString(),
      });
      const result = buildCursorQuery({ status: 'active' }, cursor, 1, 20);
      expect(result.skip).toBeUndefined();
      expect(result.take).toBe(21);
      expect(result.usedCursor).toBe(true);
    });
  });
});
