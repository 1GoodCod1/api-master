import { open, unlink } from 'fs/promises';

/** Magic bytes и допустимые расширения (расширение должно соответствовать содержимому) */
const MAGIC: { buf: number[]; exts: string[] }[] = [
  { buf: [0xff, 0xd8, 0xff], exts: ['jpg', 'jpeg'] },
  { buf: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], exts: ['png'] },
  { buf: [0x47, 0x49, 0x46, 0x38], exts: ['gif'] },
  { buf: [0x47, 0x49, 0x46, 0x39], exts: ['gif'] },
  { buf: [0x25, 0x50, 0x44, 0x46], exts: ['pdf'] },
  { buf: [0xd0, 0xcf, 0x11, 0xe0], exts: ['doc'] },
  { buf: [0x50, 0x4b, 0x03, 0x04], exts: ['docx'] },
];

const ALLOWED_EXTS = new Set([
  'jpeg',
  'jpg',
  'png',
  'gif',
  'webp',
  'pdf',
  'doc',
  'docx',
]);

const HEAD_BYTES = 12;

function getExt(originalname: string): string {
  const i = originalname.lastIndexOf('.');
  return i >= 0 ? originalname.slice(i + 1).toLowerCase() : '';
}

/**
 * Читает только первые 12 байт файла вместо всего файла.
 */
async function readFileHead(filePath: string): Promise<Buffer> {
  const fh = await open(filePath, 'r');
  try {
    const buf = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await fh.read(buf, 0, HEAD_BYTES, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

/**
 * Валидация magic bytes из готового буфера.
 * Используется и для локальных файлов, и для S3 (после Range GET).
 * @throws Error при несоответствии
 */
export function validateMagicFromBuffer(
  head: Buffer,
  originalname: string,
): void {
  const ext = getExt(originalname);
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error('Invalid file extension');
  }

  // WebP: RIFF....WEBP
  if (
    head.length >= 12 &&
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    if (ext === 'webp') return;
    throw new Error(`File content (webp) does not match extension .${ext}`);
  }

  for (const { buf, exts } of MAGIC) {
    const magicBuf = Buffer.from(buf);
    if (
      head.length >= magicBuf.length &&
      head.subarray(0, magicBuf.length).equals(magicBuf)
    ) {
      if (exts.includes(ext)) return;
      throw new Error(
        `File content (${exts[0]}) does not match extension .${ext}`,
      );
    }
  }
  throw new Error('File content could not be recognised as an allowed type');
}

/**
 * Проверяет, что первые байты файла соответствуют заявленному расширению.
 * Читает только первые 12 байт (не весь файл).
 * @throws Error с сообщением при несоответствии
 */
export async function validateFileMagic(
  filePath: string,
  originalname: string,
): Promise<void> {
  const head = await readFileHead(filePath);
  validateMagicFromBuffer(head, originalname);
}

const LEAD_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

/**
 * Валидация magic bytes из буфера — только изображения для заявок.
 * @throws Error при несоответствии
 */
export function validateLeadImageMagicFromBuffer(
  head: Buffer,
  originalname: string,
): void {
  const ext = getExt(originalname);
  if (!LEAD_IMAGE_EXTS.has(ext)) {
    throw new Error('Invalid file extension');
  }

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    if (ext === 'jpg' || ext === 'jpeg') return;
    throw new Error('File content does not match extension');
  }

  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (head.length >= 8 && head.subarray(0, 8).equals(PNG_SIG)) {
    if (ext === 'png') return;
    throw new Error('File content does not match extension');
  }

  const gifHdr = Buffer.from([0x47, 0x49, 0x46, 0x38]);
  if (head.length >= 4 && head.subarray(0, 4).equals(gifHdr)) {
    if (ext === 'gif') return;
    throw new Error('File content does not match extension');
  }

  if (
    head.length >= 12 &&
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    if (ext === 'webp') return;
    throw new Error('File content does not match extension');
  }

  throw new Error(
    'File content could not be recognised as an allowed image type',
  );
}

/**
 * Только изображения для вложений к заявке (JPEG/PNG/GIF/WebP).
 * Читает только первые 12 байт.
 */
export async function validateLeadImageMagic(
  filePath: string,
  originalname: string,
): Promise<void> {
  const head = await readFileHead(filePath);
  validateLeadImageMagicFromBuffer(head, originalname);
}

export async function unlinkIfExists(path: string): Promise<void> {
  await unlink(path).catch(() => {});
}
