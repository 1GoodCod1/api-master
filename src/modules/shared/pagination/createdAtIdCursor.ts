export type CreatedAtIdCursor = {
  createdAt: string; // ISO
  id: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function encodeCreatedAtIdCursor(cursor: CreatedAtIdCursor): string {
  const json = JSON.stringify(cursor);
  // Node supports base64url; keep token URL-safe without extra escaping.
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCreatedAtIdCursor(
  token: string | undefined | null,
): CreatedAtIdCursor | null {
  if (!token) return null;
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return null;
    const createdAt = parsed.createdAt;
    const id = parsed.id;
    if (typeof createdAt !== 'string' || typeof id !== 'string') return null;
    const dt = new Date(createdAt);
    if (Number.isNaN(dt.getTime())) return null;
    if (!id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function buildCreatedAtIdCursorWhereDesc<
  TWhere extends Record<string, unknown>,
>(where: TWhere, cursor: CreatedAtIdCursor): TWhere {
  const dt = new Date(cursor.createdAt);
  // createdAt equality is safe in SQL; id tie-breaker keeps stable ordering
  return {
    AND: [
      where,
      {
        OR: [
          { createdAt: { lt: dt } },
          { createdAt: dt, id: { lt: cursor.id } },
        ],
      },
    ],
  } as unknown as TWhere;
}

export function nextCursorFromLastCreatedAtId<
  TItem extends { id: string; createdAt: Date },
>(items: TItem[]): string | null {
  const last = items.at(-1);
  if (!last) return null;
  return encodeCreatedAtIdCursor({
    id: last.id,
    createdAt: last.createdAt.toISOString(),
  });
}
