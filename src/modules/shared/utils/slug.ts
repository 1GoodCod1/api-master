/**
 * Генерация slug из строки
 * Преобразует текст в URL-friendly формат
 */

export function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Заменяем кириллицу на латиницу
      .replace(/[а-яё]/g, (char) => {
        const map: Record<string, string> = {
          а: 'a',
          б: 'b',
          в: 'v',
          г: 'g',
          д: 'd',
          е: 'e',
          ё: 'e',
          ж: 'zh',
          з: 'z',
          и: 'i',
          й: 'y',
          к: 'k',
          л: 'l',
          м: 'm',
          н: 'n',
          о: 'o',
          п: 'p',
          р: 'r',
          с: 's',
          т: 't',
          у: 'u',
          ф: 'f',
          х: 'h',
          ц: 'ts',
          ч: 'ch',
          ш: 'sh',
          щ: 'sch',
          ъ: '',
          ы: 'y',
          ь: '',
          э: 'e',
          ю: 'yu',
          я: 'ya',
        };
        return map[char] || char;
      })
      // Заменяем все не-латинские символы и пробелы на дефисы
      .replace(/[^a-z0-9]+/g, '-')
      // Удаляем дефисы в начале и конце
      .replace(/^-+|-+$/g, '')
      // Ограничиваем длину
      .slice(0, 100)
  );
}

/**
 * Генерация уникального slug с добавлением случайного суффикса
 */
export function generateUniqueSlug(
  base: string,
  existingSlugs: string[] = [],
): string {
  const baseSlug = generateSlug(base);
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Генерация уникального slug с запросом в БД только по префиксу (O(k) вместо O(n))
 * @param base Исходная строка (имя)
 * @param getSlugsWithPrefix Функция, возвращающая slug'и с заданным префиксом
 */
export async function generateUniqueSlugWithDb(
  base: string,
  getSlugsWithPrefix: (prefix: string) => Promise<string[]>,
): Promise<string> {
  const baseSlug = generateSlug(base);
  const similar = await getSlugsWithPrefix(baseSlug);
  const existingSet = new Set(
    similar.filter(Boolean).map((s) => (s || '').toLowerCase()),
  );

  if (!existingSet.has(baseSlug)) return baseSlug;

  let counter = 1;
  let slug = `${baseSlug}-${counter}`;
  while (existingSet.has(slug)) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  return slug;
}
