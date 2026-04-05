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
import {
  applyGlobalPrefix,
  createShutdownHandler,
  getCorsOrigins,
  getHelmetConfig,
  validateProductionSecrets,
  winstonConfig,
} from './config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  CacheControlInterceptor,
  TimeoutInterceptor,
  TransformInterceptor,
} from './common/interceptors';
import { requestIdMiddleware } from './common/request-context';

const isShuttingDownRef = { current: false };

async function bootstrap() {
  try {
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

    applyGlobalPrefix(app);

    app.use(requestIdMiddleware);

    if (useHttpOnlyCookie) {
      app.use(cookieParser());
    }

    const nestLogger = WinstonModule.createLogger(winstonConfig);
    app.useLogger(nestLogger);

    const configService = app.get(ConfigService);
    validateProductionSecrets(configService);

    app.use(helmet(getHelmetConfig(isProd)));

    app.use((compression as () => RequestHandler)());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter(configService));
    app.useGlobalInterceptors(new CacheControlInterceptor());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalInterceptors(
      new TimeoutInterceptor(
        configService.get<number>('requestTimeoutMs', 30000),
      ),
    );

    if (!isProd) {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('faber.md API')
        .setDescription('Marketplace for masters in Moldova')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('docs', app, document);
    }

    const port = configService.get<number>('port', 4000);
    await app.listen(port);

    const logger = new Logger('Bootstrap');
    if (isProd) {
      const apiUrl = configService.get<string>('apiUrl', '');
      const frontendUrl = configService.get<string>('frontendUrl', '');
      logger.log(
        `[PRODUCTION] NODE_ENV=production | API=${apiUrl || '(not set)'} | FRONTEND=${frontendUrl || '(not set)'}`,
      );
    }
    logger.log(`Application listening at: http://localhost:${port}`);
    logger.log(`REST API base path: /api/v1`);
    if (!isProd) {
      logger.log(`Swagger UI: http://localhost:${port}/docs`);
    }

    const shutdown = createShutdownHandler(app, isShuttingDownRef);
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    console.error('[ERROR] Failed to start application:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  if (isShuttingDownRef.current && (reason === undefined || reason === null)) {
    return;
  }
  console.error('[UNHANDLED REJECTION] Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  if (process.env.NODE_ENV === 'production' && !isShuttingDownRef.current) {
    console.error(
      '[UNHANDLED REJECTION] Logged in production — not exiting to preserve uptime',
    );
  }
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION] Uncaught Exception:', error);
  process.exit(1);
});

void bootstrap();
