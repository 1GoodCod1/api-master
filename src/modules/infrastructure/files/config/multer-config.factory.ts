import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { StorageEngine } from 'multer';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';

const getExt = (p: string): string => extname(p);
const nextUuid = (): string => (uuidv4 as () => string)();

const B2_REGION_REGEX = /^[a-z]{2}-[a-z]+-\d{3}$/;

function getValidB2Region(region: unknown): string {
  if (typeof region !== 'string' || !region) return 'eu-central-003';
  if (!B2_REGION_REGEX.test(region)) return 'eu-central-003';
  return region;
}

function getB2Endpoint(region: string): string {
  return `https://s3.${region}.backblazeb2.com`;
}

function getValidB2Endpoint(custom: unknown, fallback: string): string {
  if (typeof custom !== 'string' || !custom.trim()) return fallback;
  try {
    const u = new URL(custom.trim());
    if (u.protocol !== 'https:') return fallback;
    if (!u.hostname.endsWith('.backblazeb2.com')) return fallback;
    return u.origin;
  } catch {
    return fallback;
  }
}

const ALLOWED_EXTENSIONS = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/;

const fileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (err: Error | null, ok: boolean) => void,
) => {
  const isValid = ALLOWED_EXTENSIONS.test(
    getExt(file.originalname).toLowerCase(),
  );
  cb(isValid ? null : new Error('Invalid file type'), isValid);
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function createMulterOptions(configService: ConfigService) {
  const logger = new Logger('FilesModule');

  const b2KeyId = configService.get<string>('b2.applicationKeyId');
  const b2Key = configService.get<string>('b2.applicationKey');
  const b2Bucket = configService.get<string>('b2.bucket');
  const useB2 = !!(b2KeyId && b2Key && b2Bucket);

  if (useB2) {
    const b2Region = getValidB2Region(configService.get('b2.region'));
    const defaultEndpoint = getB2Endpoint(b2Region);
    const endpoint = getValidB2Endpoint(
      configService.get('b2.endpoint'),
      defaultEndpoint,
    );

    const s3 = new S3Client({
      credentials: { accessKeyId: b2KeyId, secretAccessKey: b2Key },
      region: b2Region,
      endpoint,
      forcePathStyle: true,
    });

    s3.middlewareStack.add(
      (next) => (args) => {
        const input = args.input as Record<string, unknown> | undefined;
        if (input && 'ACL' in input) delete input.ACL;
        return next(args);
      },
      { step: 'initialize', name: 'stripACL' },
    );

    logger.log(
      `Storage: Backblaze B2 (bucket=${b2Bucket}, region=${b2Region}, endpoint=${endpoint})`,
    );

    // multer-s3 has no proper TypeScript types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const autoContentType = multerS3.AUTO_CONTENT_TYPE as (
      req: Express.Request,
      file: Express.Multer.File,
      cb: (
        err: Error | null,
        mime?: string,
        stream?: NodeJS.ReadableStream,
      ) => void,
    ) => void;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const s3Storage: StorageEngine = multerS3({
      s3,
      bucket: b2Bucket,
      contentType: autoContentType,
      contentDisposition: 'inline',
      metadata: (
        _req: Express.Request,
        _file: Express.Multer.File,
        cb: (err: Error | null, metadata?: Record<string, string>) => void,
      ) => {
        cb(null, { 'x-amz-meta-source': 'faber.md' });
      },
      key: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (err: Error | null, key?: string) => void,
      ) => {
        cb(null, `uploads/${nextUuid()}${getExt(file.originalname)}`);
      },
    }) as StorageEngine;

    return {
      storage: s3Storage,
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter,
    };
  }

  if (configService.get<string>('nodeEnv') === 'production') {
    logger.error(
      '🚨 CRITICAL: B2 storage is NOT configured in PRODUCTION. Local diskStorage will cause data loss across pods. Set B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET.',
    );
    throw new Error(
      'Storage: Local diskStorage disabled in production to prevent file fragmentation across pods.',
    );
  }

  logger.warn(
    'Storage: LOCAL disk (./uploads). Set B2 env vars for Backblaze B2.',
  );

  return {
    storage: diskStorage({
      destination: './uploads',
      filename: (_req, file, cb) => {
        cb(null, `${nextUuid()}${getExt(file.originalname)}`);
      },
    }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter,
  };
}
