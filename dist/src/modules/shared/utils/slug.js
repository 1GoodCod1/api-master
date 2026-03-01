"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = generateSlug;
exports.generateUniqueSlug = generateUniqueSlug;
exports.generateUniqueSlugWithDb = generateUniqueSlugWithDb;
function generateSlug(text) {
    return (text
        .toLowerCase()
        .trim()
        .replace(/[а-яё]/g, (char) => {
        const map = {
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
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100));
}
function generateUniqueSlug(base, existingSlugs = []) {
    const baseSlug = generateSlug(base);
    let slug = baseSlug;
    let counter = 1;
    while (existingSlugs.includes(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    return slug;
}
async function generateUniqueSlugWithDb(base, getSlugsWithPrefix) {
    const baseSlug = generateSlug(base);
    const similar = await getSlugsWithPrefix(baseSlug);
    const existingSet = new Set(similar.filter(Boolean).map((s) => (s || '').toLowerCase()));
    if (!existingSet.has(baseSlug))
        return baseSlug;
    let counter = 1;
    let slug = `${baseSlug}-${counter}`;
    while (existingSet.has(slug)) {
        counter++;
        slug = `${baseSlug}-${counter}`;
    }
    return slug;
}
//# sourceMappingURL=slug.js.map