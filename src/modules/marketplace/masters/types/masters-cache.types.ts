/** Callback инвалидации кеша профиля мастера после мутаций. */
export type InvalidateMasterCacheFn = (
  masterId: string,
  slug?: string | null,
) => Promise<void>;
