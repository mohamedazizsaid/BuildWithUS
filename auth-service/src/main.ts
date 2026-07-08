import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllRpcExceptionsFilter } from './all-rpc-exceptions.filter';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

async function bootstrap() {
  const grpcPort = process.env.GRPC_PORT || '50055';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: `0.0.0.0:${grpcPort}`,
        package: 'auth',
        protoPath: join(__dirname, '../proto/auth.proto'),
        loader: {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    },
  );

  // Preserve real error messages across gRPC (NestJS hides them by default).
  app.useGlobalFilters(new AllRpcExceptionsFilter());

  await app.listen();
  console.log(`Auth service running on gRPC port ${grpcPort}`);

  // Register with Consul if available
  const consulHost = process.env.CONSUL_HOST || 'consul';
  const consulPort = process.env.CONSUL_PORT || '8500';
  const serviceHost = process.env.SERVICE_HOST || 'auth-service';
  try {
    const res = await fetch(`http://${consulHost}:${consulPort}/v1/agent/service/register`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID: 'auth-service-1',
        Name: 'auth-service',
        Address: serviceHost,
        Port: parseInt(grpcPort),
        Tags: ['grpc', 'auth'],
        Check: {
          TCP: `${serviceHost}:${grpcPort}`,
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
