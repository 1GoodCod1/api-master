import type {
  Master,
  Category,
  City,
  User,
  MasterPhoto,
  File,
} from '@prisma/client';

export type MasterWithRecommendationMeta = Master & {
  category: Category;
  city: City;
  user: Pick<User, 'id' | 'isVerified'>;
  photos: (MasterPhoto & { file: File })[];
  recommendationScore?: number;
  reasons?: string[];
};

const dedupeReasons = (reasons: string[]): string[] => [...new Set(reasons)];

/** Мастер с фото в галерее или аватаром — иначе карточка пустая. */
export function isMasterPresentationReady(m: {
  avatarFileId: string | null;
  photos: unknown[];
}): boolean {
  return m.photos.length > 0 || m.avatarFileId != null;
}

/**
 * Жадный отбор с ограничением карточек на категорию; при нехватке — добор без ограничения.
 */
export function pickDiverseMasters(
  ordered: MasterWithRecommendationMeta[],
  limit: number,
  maxPerCategory: number,
  excludeIds: Set<string>,
): MasterWithRecommendationMeta[] {
  const counts = new Map<string, number>();
  const result: MasterWithRecommendationMeta[] = [];
  const used = new Set<string>();

  const tryPush = (m: MasterWithRecommendationMeta, enforceCap: boolean) => {
    if (used.has(m.id) || excludeIds.has(m.id)) return false;
    const cat = m.categoryId;
    const c = counts.get(cat) ?? 0;
    if (enforceCap && c >= maxPerCategory) return false;
    result.push(m);
    used.add(m.id);
    counts.set(cat, c + 1);
    return true;
  };

  for (const m of ordered) {
    if (result.length >= limit) break;
    tryPush(m, true);
  }

  if (result.length < limit) {
    for (const m of ordered) {
      if (result.length >= limit) break;
      tryPush(m, false);
    }
  }

  return result.map((m) => ({
    ...m,
    reasons: m.reasons ? dedupeReasons(m.reasons) : undefined,
  }));
}
