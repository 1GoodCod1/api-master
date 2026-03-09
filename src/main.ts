import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { RequestHandler } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { winstonConfig } from './config/winston.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { CacheControlInterceptor } from './common/interceptors/cache-control.interceptor';

function getCorsOrigins(): string | string[] {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const origins = (process.env.FRONTEND_URL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (origins.length === 0) {
      console.error(
        '[FATAL] FRONTEND_URL is required in production. Set env FRONTEND_URL=https://your-domain.com',
      );
      process.exit(1);
    }
    return origins.length === 1 ? origins[0] : origins;
  }
  const list = [process.env.FRONTEND_URL, 'http://localhost:3000'].filter(
    Boolean,
  ) as string[];
  return list.length ? list : 'http://localhost:3000';
}

/** CSP imgSrc: only self, data, blob, and allowed app origins (no blanket https:). */
function getCspImgSrc(): string[] {
  const base = ["'self'", 'data:', 'blob:'];
  const apiUrl = process.env.API_URL || 'http://localhost:4000';
  const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origins = [apiUrl, ...frontendUrls].filter((u) => u);
  return [...base, ...origins];
}

function validateProductionSecrets(config: ConfigService): void {
  if (process.env.NODE_ENV !== 'production') return;
  const access = config.get<string>('jwt.accessSecret', '');
  const refresh = config.get<string>('jwt.refreshSecret', '');
  const enc = config.get<string>('idEncryption.secret', '');
  const bad =
    !access ||
    access.includes('change-me') ||
    !refresh ||
    refresh.includes('change-me') ||
    !enc ||
    enc === 'mm-secret-2024';
  if (bad) {
    console.error(
      '[FATAL] In production set secure values: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ID_ENCRYPTION_SECRET. Do not use defaults.',
    );
    process.exit(1);
  }
}

async function bootstrap() {
  try {
    // USE_HTTPONLY_COOKIE=true  → refresh token stored in httpOnly cookie (most secure, default in prod)
    // USE_HTTPONLY_COOKIE=false → refresh token sent in response body (fallback for dev/mobile apps)
    const isProd = process.env.NODE_ENV === 'production';
    const useHttpOnlyCookie =
      process.env.USE_HTTPONLY_COOKIE === 'true' ||
      (process.env.USE_HTTPONLY_COOKIE === undefined && isProd);
    const app = await NestFactory.create(AppModule, {
      logger: false,
      bufferLogs: true,
      rawBody: true,
      cors: {
        origin: getCorsOrigins(),
        credentials: useHttpOnlyCookie,
      },
    });
    if (useHttpOnlyCookie) {
      app.use(cookieParser());
    }

    const nestLogger = WinstonModule.createLogger(winstonConfig);
    app.useLogger(nestLogger);

    const configService = app.get(ConfigService);
    validateProductionSecrets(configService);
    app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: getCspImgSrc(),
            connectSrc: ["'self'", 'wss:', 'ws:'],
            frameSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            upgradeInsecureRequests: isProd ? [] : null,
          },
        },
        strictTransportSecurity: isProd
          ? { maxAge: 31536000, includeSubDomains: true, preload: true }
          : false,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      }),
    );
    const compressionMiddleware = compression as () => RequestHandler;
    app.use(compressionMiddleware());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new CacheControlInterceptor());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalInterceptors(
      new TimeoutInterceptor(
        configService.get<number>('requestTimeoutMs', 30000),
      ),
    );

    // Swagger
    const config = new DocumentBuilder()
      .setTitle('Master-Hub API')
      .setDescription('Marketplace for masters in Moldova')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    if (process.env.NODE_ENV !== 'production') {
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('docs', app, document);
    }

    const port = configService.get<number>('port', 4000);
    await app.listen(port);

    const logger = new Logger('Bootstrap');
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      const apiUrl = configService.get<string>('apiUrl', '');
      const frontendUrl = configService.get<string>('frontendUrl', '');
      logger.log(
        `[PRODUCTION] NODE_ENV=production | API=${apiUrl || '(not set)'} | FRONTEND=${frontendUrl || '(not set)'}`,
      );
    }
    logger.log(`[5] Приложение запущено на: http://localhost:${port}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.log(`Swagger документация: http://localhost:${port}/docs`);
    }
    const shutdown = async (signal: string) => {
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;

      const logger = new Logger('Shutdown');
      logger.log(`Received ${signal}, starting graceful shutdown...`);
      const shutdownTimeout = setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);

      try {
        await Promise.race([
          app.close(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Shutdown timeout')), 8000);
          }),
        ]);
        clearTimeout(shutdownTimeout);
        logger.log('Application closed gracefully');
        process.exit(0);
      } catch (error: unknown) {
        clearTimeout(shutdownTimeout);
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Error during shutdown: ${message}`);
        logger.log('Application closed');
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    console.error('[ERROR] Failed to start application:', error);
    process.exit(1);
  }
}

let isShuttingDown = false;
process.on('unhandledRejection', (reason, promise) => {
  if (isShuttingDown && (reason === undefined || reason === null)) {
    return;
  }
  console.error('[UNHANDLED REJECTION] Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  if (process.env.NODE_ENV === 'production' && !isShuttingDown) {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION] Uncaught Exception:', error);
  process.exit(1);
});

void bootstrap();
