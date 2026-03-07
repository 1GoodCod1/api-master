import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { FilesService } from './files.service';

const getExt = (p: string): string => extname(p);
const nextUuid = (): string => (uuidv4 as () => string)();

/** Allowed B2 region format (e.g. eu-central-003, us-west-004). Mitigates injection. */
const B2_REGION_REGEX = /^[a-z]{2}-[a-z]+-\d{3}$/;

function getValidB2Region(region: unknown): string {
  if (typeof region !== 'string' || !region) return 'eu-central-003';
  if (!B2_REGION_REGEX.test(region)) return 'eu-central-003';
  return region;
}

/** Build B2 endpoint from region. HTTPS only. */
function getB2Endpoint(region: string): string {
  return `https://s3.${region}.backblazeb2.com`;
}

/** Validate custom B2 endpoint: HTTPS and backblazeb2.com only (SSRF mitigation). */
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

import { FilesController } from './files.controller';
import { PrismaModule } from 'src/modules/shared/database/prisma.module';

const FILE_FILTER = (
  req: unknown,
  file: Express.Multer.File,
  cb: (err: Error | null, ok: boolean) => void,
) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const isValid = allowedTypes.test(getExt(file.originalname).toLowerCase());
  cb(isValid ? null : new Error('Invalid file type'), isValid);
};

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('FilesModule');
        const maxFileSize = 10 * 1024 * 1024; // 10MB

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
            credentials: {
              accessKeyId: b2KeyId,
              secretAccessKey: b2Key,
            },
            region: b2Region,
            endpoint,
            forcePathStyle: true,
          });

          // B2 rejects all canned ACL values; strip the ACL param before the request is serialized
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

          return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            storage: multerS3({
              s3,
              bucket: b2Bucket,
              // B2 does not support per-object ACLs — bucket publicity is set in the B2 dashboard
              key: (
                _req: Express.Request,
                file: Express.Multer.File,
                cb: (err: Error | null, key?: string) => void,
              ) => {
                const filename = `${nextUuid()}${getExt(file.originalname)}`;
                cb(null, `uploads/${filename}`);
              },
            }),
            limits: { fileSize: maxFileSize },
            fileFilter: FILE_FILTER,
          };
        }

        if (process.env.NODE_ENV === 'production') {
          logger.error(
            '🚨 CRITICAL: B2 storage is NOT configured in PRODUCTION environment. Local diskStorage will split files across multiple pods/containers causing data loss and 404s. Set B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET.',
          );
          throw new Error(
            'Storage: Local diskStorage disabled in production to prevent file fragmentation across pods.',
          );
        }

        logger.warn(
          'Storage: LOCAL disk (./uploads). Not recommended for distributed setups. Set B2 environment variables to use Backblaze B2.',
        );

        return {
          storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
              const filename = `${nextUuid()}${getExt(file.originalname)}`;
              cb(null, filename);
            },
          }),
          limits: { fileSize: maxFileSize },
          fileFilter: FILE_FILTER,
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule,
    PrismaModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
