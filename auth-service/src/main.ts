import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllHttpExceptionsFilter } from './all-http-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Body parsers
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true }));


  // Global exception filter — converts plain Error() into clean JSON HTTP responses.
  app.useGlobalFilters(new AllHttpExceptionsFilter());

  // CORS — the only caller is the api-gateway (and health check probes).
  // Allowing * is safe here because this service is not directly reachable
  // from the browser — it sits behind the gateway.
  app.enableCors({ origin: '*' });

  // Render provides PORT automatically. Default to 3003 for local dev.
  const port = Number(process.env.PORT) || 3003;
  await app.listen(port, '0.0.0.0');

  console.log(`Auth service running on http://0.0.0.0:${port}`);
}

bootstrap();