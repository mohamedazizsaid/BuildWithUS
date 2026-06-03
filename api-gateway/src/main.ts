import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Increase upload size limit (videos, large payloads)
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

  // Cookies (JWT)
  app.use(cookieParser());

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