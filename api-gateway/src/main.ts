import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:5173', // React dev server
    credentials: true,               // allow cookies
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API Gateway running on http://localhost:${port}`);

  // Register with Consul if available
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
