import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, raw, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // Disable Nest's default body parser so we can register our own — the Stripe
  // webhook route needs the RAW body to verify the signature.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // Raw body for the Stripe webhook ONLY — must come before the JSON parser,
  // otherwise the stream is already consumed and the signature check fails.
  app.use('/billing/webhook', raw({ type: '*/*' }));

  // Normal parsers for everything else. Large limits for video/media uploads.
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Cookies (JWT)
  app.use(cookieParser());

  // Turn gRPC / unexpected errors into clean JSON the frontend can display.
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS — allow the dev frontends, plus any production origin(s) from env.
  // FRONTEND_ORIGIN can be a comma-separated list (e.g. the server URL).
  const corsOrigins = [
    'http://localhost:3001',
    'http://localhost:5173',
    ...(process.env.FRONTEND_ORIGIN ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`API Gateway running on http://localhost:${port}`);

  const consulHost = process.env.CONSUL_HOST || 'consul';
  const consulPort = process.env.CONSUL_PORT || '8500';
  const serviceHost = process.env.SERVICE_HOST || 'api-gateway';

  try {
    const res = await fetch(
      `http://${consulHost}:${consulPort}/v1/agent/service/register`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ID: 'api-gateway-1',
          Name: 'api-gateway',
          Address: serviceHost,
          Port: Number(port),
          Tags: ['http', 'gateway'],
          Check: {
            TCP: `${serviceHost}:${port}`,
            Interval: '10s',
            Timeout: '5s',
          },
        }),
      },
    );

    if (res.ok) console.log('Registered with Consul');
  } catch {
    console.log('Consul not available, skipping registration');
  }
}

bootstrap();