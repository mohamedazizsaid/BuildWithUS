import { config } from 'dotenv';
config();

import * as http from 'http';
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
  // =========================
  // gRPC
  // =========================
  const grpcPort = Number(process.env.GRPC_PORT) || 50056;

  // In Docker: PROTO_ROOT=/app/proto
  // In dev: ../packages/proto
  const protoRootEnv = process.env.PROTO_ROOT || '../packages/proto';
  const protoBasePath = join(process.cwd(), protoRootEnv);

  // =========================
  // gRPC Microservice
  // =========================
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: `0.0.0.0:${grpcPort}`,

        package: [
          'common',
          'templates.commands',
          'templates.queries',
        ],

        protoPath: [
          healthCheckProtoPath,
          join(protoBasePath, 'common.proto'),
          join(protoBasePath, 'template_commands.proto'),
          join(protoBasePath, 'template_queries.proto'),
        ],

        loader: {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          includeDirs: [
            protoBasePath,
            join(protoBasePath, 'deps'),
          ],
        },

        onLoadPackageDefinition: (pkg, server) => {
          const healthService = app.get(GrpcHealthService);

          healthService.registerWithServer(server);
          healthService.updateStatus('SERVING');
        },
      },
    },
  );

  // =========================
  // Shutdown hooks
  // =========================
  app.enableShutdownHooks();

  // =========================
  // Logger
  // =========================
  const logger = app.get(AppLoggerService);

  // =========================
  // gRPC infrastructure
  // =========================
  app.useGlobalFilters(
    new GrpcExceptionFilter(),
  );

  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new TransformInterceptor(),
  );

  // =========================
  // Start gRPC
  // =========================
  await app.listen();

  logger.log(
    `Template Service running on gRPC port ${grpcPort}`,
  );

  // =========================
  // HTTP server for Render
  // =========================
  const httpPort = Number(process.env.PORT) || 10000;

  const httpServer = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
      });

      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'template-service',
          grpc: `0.0.0.0:${grpcPort}`,
        }),
      );

      return;
    }

    res.writeHead(404, {
      'Content-Type': 'application/json',
    });

    res.end(
      JSON.stringify({
        status: 'not_found',
      }),
    );
  });

  httpServer.listen(httpPort, '0.0.0.0', () => {
    logger.log(
      `HTTP health server running on 0.0.0.0:${httpPort}`,
    );
  });

  // =========================
  // Consul
  // =========================
  const consulHost = process.env.CONSUL_HOST || 'consul';
  const consulPort = process.env.CONSUL_PORT || '8500';
  const serviceHost =
    process.env.SERVICE_HOST || 'template-service';

  try {
    const res = await fetch(
      `http://${consulHost}:${consulPort}/v1/agent/service/register`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ID: 'template-service-1',
          Name: 'template-service',
          Address: serviceHost,
          Port: grpcPort,
          Tags: ['grpc', 'templates'],
          Check: {
            TCP: `${serviceHost}:${grpcPort}`,
            Interval: '10s',
            Timeout: '5s',
          },
        }),
      },
    );

    if (res.ok) {
      logger.log('Registered with Consul');
    }
  } catch {
    logger.log(
      'Consul not available, skipping registration',
    );
  }
}

void bootstrap();