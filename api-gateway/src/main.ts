import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

/**
 * Bootstrap — starts the API Gateway REST server.
 * This is the SINGLE entry point for the entire backend.
 * Frontend (Next.js) → Gateway (REST) → Microservices (gRPC)
 */
async function bootstrap() {
  // Create a standard HTTP/REST server (not gRPC — that's for the microservices)
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  // Increase upload size limit for videos (50MB)
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // Enable cookie parsing — so we can read JWT tokens from browser cookies
  // When a user logs in, the token is stored as an httpOnly cookie
  app.use(cookieParser());

  // Enable CORS — allows the frontend (different port) to make requests to the gateway
  // credentials: true → allows cookies to be sent cross-origin
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:5173'], // Next.js + Vite dev servers
    credentials: true,               // allow cookies
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API Gateway running on http://localhost:${port}`);

  // Register this service with Consul (service discovery dashboard)
  // If Consul is not running, we just skip — the gateway works fine without it
  const consulHost = process.env.CONSUL_HOST || 'consul';
  const consulPort = process.env.CONSUL_PORT || '8500';
  const serviceHost = process.env.SERVICE_HOST || 'api-gateway';
  try {
    const res = await fetch(`http://${consulHost}:${consulPort}/v1/agent/service/register`, {
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
    });
    if (res.ok) console.log('Registered with Consul');
  } catch {
    console.log('Consul not available, skipping registration');
  }
}

bootstrap();
