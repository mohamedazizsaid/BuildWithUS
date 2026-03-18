// Domain
export { AggregateRoot } from './domain/aggregate-root';
export { DomainEvent } from './domain/domain-event';
export { BusinessRuleException, NotFoundException } from './domain/exceptions';
export {
  TemplateId,
  TemplateName,
  TemplateDescription,
  TemplateSubject,
  TemplateContent,
  CampaignType,
} from './domain/value-objects';

// Infrastructure - gRPC
export { GrpcExceptionFilter } from './infrastructure/grpc-exception.filter';
export { RequestIdInterceptor, TransformInterceptor } from './infrastructure/interceptors';
export { GrpcHealthService, HealthModule } from './infrastructure/health';
export { TimestampHelper } from './infrastructure/timestamp';

// Infrastructure - Modules
export { ConsulModule } from './infrastructure/consul';
export { LoggerModule, AppLoggerService } from './infrastructure/logger';
export {
  JetStreamModule,
  JetStreamPublisherService,
  BaseJetStreamEventHandler,
  TEMPLATES_STREAM,
} from './infrastructure/jetstream';
export type { EventHandlerConfig } from './infrastructure/jetstream';

// Config
export { validateEnv, z } from './config/validate-env';
