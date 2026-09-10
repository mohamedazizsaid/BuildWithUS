import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { AllHttpExceptionsFilter } from './all-http-exceptions.filter.js';
import {
  TransformInterceptor,
  AppLoggerService,
} from '@winaity/shared-kernel';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Body parsers
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true }));

  // Global filters & interceptors
  app.useGlobalFilters(new AllHttpExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS — called by api-gateway
  app.enableCors({ origin: '*' });

  // Shutdown hooks
  app.enableShutdownHooks();

  // Logger
  const logger = app.get(AppLoggerService);

  // Render provides PORT automatically, default to 3002 for local dev
  const port = Number(process.env.PORT) || 3002;
  await app.listen(port, '0.0.0.0');

  logger.log(`Template service running on http://0.0.0.0:${port}`);
}

void bootstrap();