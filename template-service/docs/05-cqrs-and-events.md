# CQRS & Event Flow

## What Is CQRS?

CQRS = **Command Query Responsibility Segregation**. It means:

- **Commands** = operations that **change** data (create, update, delete)
- **Queries** = operations that **read** data (get, list, search)

They're handled by separate classes, dispatched through separate buses. This keeps write logic cleanly separated from read logic.

## The Request Flow

```
gRPC Request
     │
     ▼
┌──────────────────────────────┐
│  gRPC Controller             │   Receives proto request
│  (infrastructure/grpc/)      │
└──────────┬───────────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
 CommandBus   QueryBus         ← NestJS CQRS module routes to the right handler
     │           │
     ▼           ▼
 CommandHandler  QueryHandler   ← Executes the business logic
     │           │
     ▼           │
 Domain Aggregate              ← Commands modify the aggregate
     │           │
     ▼           ▼
 Repository                    ← Both read/write through repository
     │
     ▼
 Domain Events → NATS          ← Commands raise events, published to NATS
```

## Commands

| Command                 | Handler                    | What It Does                          |
| ----------------------- | -------------------------- | ------------------------------------- |
| `CreateTemplateCommand` | `CreateTemplateHandler`    | Validates, creates aggregate, saves   |
| `UpdateTemplateCommand` | `UpdateTemplateHandler`    | Finds template, applies changes, saves|
| `DeleteTemplateCommand` | `DeleteTemplateHandler`    | Finds template, soft-deletes, saves   |

### Command Handler Pattern

Every command handler follows the same steps:

```
1. Receive command from CommandBus
2. Create value objects from raw data
3. Call domain aggregate method (create/update/delete)
4. Save aggregate via repository
5. Return result (aggregate or void)
```

## Queries

| Query                       | Handler                        | What It Does                         |
| --------------------------- | ------------------------------ | ------------------------------------ |
| `HealthCheckQuery`          | `HealthCheckHandler`           | Returns service status               |
| `GetTemplateQuery`          | `GetTemplateHandler`           | Fetches one template by ID           |
| `ListTemplatesQuery`        | `ListTemplatesHandler`         | Paginated list with filters/search   |
| `GetPopularTemplatesQuery`  | `GetPopularTemplatesHandler`   | Top templates by usage count         |
| `RenderTemplateQuery`       | `RenderTemplateHandler`        | Renders template with variables      |

### Query Handler Pattern

```
1. Receive query from QueryBus
2. Fetch data from repository (or ORM directly)
3. Transform to response DTO
4. Return (never modifies data)
```

## Domain Events

When a command modifies the aggregate, a **domain event** is raised:

| Event                  | When                      | Payload                               |
| ---------------------- | ------------------------- | ------------------------------------- |
| `TemplateCreatedEvent` | Template created           | name, description, type, subject, content, variables |
| `TemplateUpdatedEvent` | Template updated           | Same as created (full snapshot)       |
| `TemplateDeletedEvent` | Template soft-deleted      | aggregateId only                      |

### Event Flow

```
Aggregate raises event
       │
       ▼
NestJS EventBus picks it up
       │
       ▼
Event Handler (application/events/)
       │
       ▼
BaseJetStreamEventHandler publishes to NATS JetStream
       │
       ▼
Other microservices consume the event
```

### NATS Configuration

- **Stream**: `TEMPLATE_EVENTS` (configurable via `NATS_STREAM_NAME`)
- **Consumer Group**: `template-service-consumers`
- **Server**: `nats://localhost:4222` (configurable via `NATS_URL`)

Events are published so other services (e.g., a notification service, analytics service) can react to template changes without being directly coupled to this service.

## Where to Find What

| What                    | Where                                                          |
| ----------------------- | -------------------------------------------------------------- |
| Command classes         | `src/templates/application/commands/`                          |
| Command handlers        | `src/templates/application/commands/handlers/`                 |
| Query classes           | `src/templates/application/queries/`                           |
| Query handlers          | `src/templates/application/queries/handlers/`                  |
| Domain events           | `src/templates/domain/events/`                                 |
| Event handlers (NATS)   | `src/templates/application/events/`                            |
| gRPC controllers        | `src/templates/infrastructure/grpc/`                           |
