# Shared Kernel & External Dependencies

## @winaity/shared-kernel

This is an **internal package** (not from npm) that lives in the monorepo. It provides base classes and utilities used across all microservices. The template-service imports heavily from it.

### What It Provides

| Import                        | Used For                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `TemplateId`                  | Value object wrapping template UUID                       |
| `TemplateName`                | Value object with name validation (max 255 chars)         |
| `TemplateDescription`         | Value object for optional description                     |
| `TemplateSubject`             | Value object for email subject                            |
| `TemplateContent`             | Value object for template body                            |
| `CampaignType`                | Enum: `email`, `sms`, `whatsapp`                          |
| `DomainEvent`                 | Base class for all domain events                          |
| `BaseJetStreamEventHandler`   | Base class for publishing events to NATS                  |
| `GrpcExceptionFilter`         | Global gRPC error handling filter                         |
| `RequestIdInterceptor`        | Adds request tracking IDs                                 |
| `TransformInterceptor`        | Response transformation                                   |
| `HealthModule`                | Health check module (gRPC + Consul)                       |
| `ConsulModule`                | Service discovery registration                            |
| `LoggerModule`                | Structured logging                                        |
| `JetStreamModule`             | NATS JetStream connection and stream management           |
| `AppLoggerService`            | Logger service                                            |
| `GrpcHealthService`           | gRPC health check protocol                                |
| `TimestampHelper`             | Date ↔ Unix seconds conversion                            |
| `NotFoundException`           | Domain-level not found exception                          |
| `BusinessRuleException`       | Business rule violation exception                         |

### Where It Lives

In the monorepo at `packages/shared-kernel/`. Referenced in `package.json` as a file dependency:

```json
"@winaity/shared-kernel": "file:../../packages/shared-kernel"
```

## External Services

### PostgreSQL

- **Purpose**: Primary data store for templates
- **Config**: See `src/config/typeorm.config.ts`
- **Default dev DB**: `templates_db` on port `5432`
- **Driver**: `pg` package via TypeORM

### NATS JetStream

- **Purpose**: Event bus for publishing domain events
- **Events published**: `template.created`, `template.updated`, `template.deleted`
- **Config**: `NATS_URL`, `NATS_STREAM_NAME` env vars
- **Module**: `JetStreamModule` from shared-kernel

### Consul

- **Purpose**: Service discovery and health monitoring
- **What it does**: This service registers itself on startup so other services can find it
- **Health check**: gRPC health probe every 30 seconds
- **Deregister**: After 5 minutes of failed health checks
- **Tags**: `grpc`, `cqrs`, `ddd`, `templates`, `v1`, `nestjs`

## NestJS Modules Used

| Module                       | Purpose                          |
| ---------------------------- | -------------------------------- |
| `ConfigModule` (global)      | Environment variable management  |
| `TypeOrmModule`              | Database connection & entity registration |
| `CqrsModule`                 | Command/Query/Event bus          |
| `@nestjs/microservices`      | gRPC server support              |
