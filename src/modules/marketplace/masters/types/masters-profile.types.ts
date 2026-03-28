/** Форма закешированного публичного профиля мастера (ключ `masterFull`). */
export interface CachedMaster {
  id: string;
  categoryId: string | null;
  cityId: string | null;
  [key: string]: unknown;
}
