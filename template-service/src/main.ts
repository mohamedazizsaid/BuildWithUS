import { config } from 'dotenv';
config({ path: '.env' });

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { protoPath as healthCheckProtoPath } from 'grpc-health-check';
import { AppModule } from './app.module.js';
import {
  GrpcExceptionFilter,
  RequestIdInterceptor,
  TransformInterceptor,
  GrpcHealthService,
  AppLoggerService,
} from '@winaity/shared-kernel';

async function bootstrap() {
  const grpcPort = process.env.GRPC_PORT || 50056;
  // In Docker: PROTO_ROOT=/app/proto (mounted from packages/proto)
  // In dev: use relative path to packages/proto
  const protoRootEnv = process.env.PROTO_ROOT || '../packages/proto';
  const protoBasePath = join(process.cwd(), protoRootEnv);

  // Create gRPC microservice with health checks
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${grpcPort}`,
      package: ['common', 'templates.commands', 'templates.queries'],
      protoPath: [
        healthCheckProtoPath, // gRPC health check proto
        join(protoBasePath, 'common.proto'),
        join(protoBasePath, 'template_commands.proto'),
        join(protoBasePath, 'template_queries.proto'),
      ],
      loader: {
        keepCase: true, // Keep proto field names as defined
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [protoBasePath, join(protoBasePath, 'deps')],
      },
      onLoadPackageDefinition: (pkg, server) => {
        // Configure gRPC health checks using shared-kernel GrpcHealthService
        const healthService = app.get(GrpcHealthService);
        healthService.registerWithServer(server);
        healthService.updateStatus('SERVING');
      },
    },
  });

  // Enable shutdown hooks
  app.enableShutdownHooks();

  // Get logger instance
  const logger = app.get(AppLoggerService);

  // Configure global infrastructure for gRPC
  app.useGlobalFilters(new GrpcExceptionFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new TransformInterceptor(),
  );

  await app.listen();

  logger.log(`Template Service (gRPC only) running on port ${grpcPort}`);

  // Register with Consul if available
  const consulHost = process.env.CONSUL_HOST || 'consul';
  const consulPort = process.env.CONSUL_PORT || '8500';
  const serviceHost = process.env.SERVICE_HOST || 'template-service';
  try {
    const res = await fetch(`http://${consulHost}:${consulPort}/v1/agent/service/register`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID: 'template-service-1',
        Name: 'template-service',
        Address: serviceHost,
        Port: Number(grpcPort),
        Tags: ['grpc', 'templates'],
        Check: {
          TCP: `${serviceHost}:${grpcPort}`,
          Interval: '10s',
          Timeout: '5s',
        },
      }),
    });
    if (res.ok) logger.log('Registered with Consul');
  } catch {
    logger.log('Consul not available, skipping registration');
  }
}

void bootstrap();
