import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JetStreamModule, TEMPLATES_STREAM } from '@winaity/shared-kernel';

// ORM Entities
import { TemplateOrmEntity, TenantVariablesOrmEntity } from './infrastructure/persistence/entities/index.js';

// Repository Implementations
import { TemplateRepositoryImpl } from './infrastructure/persistence/repositories/index.js';

// Command Handlers
import {
  CreateTemplateHandler,
  UpdateTemplateHandler,
  DeleteTemplateHandler,
  DuplicateTemplateHandler,
  ToggleFavoriteHandler,
  UpdateTenantVariablesHandler,
  AddTenantVariableHandler,
} from './application/commands/handlers/index.js';

// Query Handlers
import {
  HealthCheckHandler,
  GetTemplateHandler,
  ListTemplatesHandler,
  GetPopularTemplatesHandler,
  RenderTemplateHandler,
  GetTenantVariablesHandler,
} from './application/queries/handlers/index.js';

// Event Handlers
import {
  TemplateCreatedHandler,
  TemplateUpdatedHandler,
  TemplateDeletedHandler,
} from './application/events/index.js';
import { TemplateRendererService } from './application/services/template-renderer.service.js';

// gRPC Controllers
import {
  TemplatesCommandsGrpcController,
  TemplatesQueriesGrpcController,
} from './infrastructure/grpc/index.js';

// Command Handlers array
const CommandHandlers = [
  CreateTemplateHandler,
  UpdateTemplateHandler,
  DeleteTemplateHandler,
  DuplicateTemplateHandler,
  ToggleFavoriteHandler,
  UpdateTenantVariablesHandler,
  AddTenantVariableHandler,
];

// Query Handlers array
const QueryHandlers = [
  HealthCheckHandler,
  GetTemplateHandler,
  ListTemplatesHandler,
  GetPopularTemplatesHandler,
  RenderTemplateHandler,
  GetTenantVariablesHandler,
];

// Event Handlers array
const EventHandlers = [
  TemplateCreatedHandler,
  TemplateUpdatedHandler,
  TemplateDeletedHandler,
];

// gRPC Controllers array
const GrpcControllers = [
  TemplatesCommandsGrpcController,
  TemplatesQueriesGrpcController,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([TemplateOrmEntity, TenantVariablesOrmEntity]),
    JetStreamModule.forRoot({
      servers: process.env.NATS_URL?.split(',') || ['nats://localhost:4222'],
      streams: [TEMPLATES_STREAM],
    }),
  ],
  controllers: [...GrpcControllers],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,

    // Repositories
    {
      provide: 'TEMPLATE_REPOSITORY',
      useClass: TemplateRepositoryImpl,
    },
    TemplateRendererService,
  ],
  exports: ['TEMPLATE_REPOSITORY'],
})
export class TemplatesModule {}
