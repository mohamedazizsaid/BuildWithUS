import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesModule } from './templates/templates.module.js';
import { configuration, AppConfig, DatabaseConfig, createNestTypeOrmConfig } from './config/index.js';
import { HealthModule, ConsulModule, LoggerModule } from '@winaity/shared-kernel';

@Module({
  imports: [
    // Global configuration module with typed config factory
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // TypeORM with typed configuration
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const dbConfig = configService.get<DatabaseConfig>('database', { infer: true })!;
        return createNestTypeOrmConfig(dbConfig);
      },
    }),

    // Health checks (gRPC mode) from shared-kernel
    HealthModule.forRoot({
      mode: 'grpc',
      indicators: ['database', 'memory'],
      memoryThreshold: 300 * 1024 * 1024, // 300MB
    }),

    // Consul service discovery with gRPC health checks
    ConsulModule.forRoot({
      host: process.env.CONSUL_HOST || 'consul',
      port: parseInt(process.env.CONSUL_PORT || '8500', 10),
      serviceName: process.env.CONSUL_SERVICE_NAME || 'template-service',
      serviceId: process.env.CONSUL_SERVICE_ID || 'template-service-1',
      serviceAddress: process.env.SERVICE_HOST || 'localhost',
      servicePort: parseInt(process.env.GRPC_PORT || '50056', 10),
      tags: ['grpc', 'cqrs', 'ddd', 'templates', 'v1', 'nestjs'],
      meta: {
        version: process.env.npm_package_version || '0.0.1',
        protocol: 'grpc',
      },
      healthCheck: {
        type: 'grpc',
        useTls: false,
        interval: '30s',
        timeout: '10s',
        deregisterAfter: '5m',
      },
    }),

    // Logger module from shared-kernel
    LoggerModule,

    // Feature modules
    TemplatesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
