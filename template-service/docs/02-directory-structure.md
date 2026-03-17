# Directory Structure — Explained

## The Big Picture

```
template-service/
├── proto/generated/          ← Auto-generated gRPC types (don't edit manually)
├── src/
│   ├── main.ts               ← Entry point: boots the gRPC server
│   ├── app.module.ts          ← Root module: wires everything together
│   ├── config/                ← Configuration & database setup
│   └── templates/             ← The actual feature (DDD layers inside)
│       ├── domain/            ← Pure business logic (no framework code)
│       ├── application/       ← Use cases: commands, queries, handlers
│       └── infrastructure/    ← Technical stuff: gRPC controllers, DB
├── docs/                      ← You are here
├── ormconfig.ts               ← TypeORM CLI config (for migrations)
├── package.json
├── tsconfig.json
└── .env.development
```

## How the Layers Connect

```
                  gRPC Request
                       │
                       ▼
            ┌─────────────────────┐
            │   infrastructure/   │   ← gRPC controllers receive requests
            │   grpc/             │
            └────────┬────────────┘
                     │  dispatches via CommandBus / QueryBus
                     ▼
            ┌─────────────────────┐
            │   application/      │   ← Handlers execute the use case
            │   commands/queries/ │
            └────────┬────────────┘
                     │  calls domain methods
                     ▼
            ┌─────────────────────┐
            │   domain/           │   ← Business rules, aggregate, events
            │   entities/events/  │
            └────────┬────────────┘
                     │  saved via repository interface
                     ▼
            ┌─────────────────────┐
            │   infrastructure/   │   ← TypeORM implements the repository
            │   persistence/      │
            └─────────────────────┘
                     │
                     ▼
                 PostgreSQL
```

## Layer by Layer

### `src/config/`

| File                | What It Does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `configuration.ts`  | Validates env vars with Zod, exports typed config                   |
| `typeorm.config.ts`  | Creates TypeORM DataSource config (used by NestJS and CLI)          |

### `src/templates/domain/` — The Business Logic

This layer has **zero dependencies on NestJS or any framework**. It's pure TypeScript.

| Folder/File                    | What It Does                                                    |
| ------------------------------ | --------------------------------------------------------------- |
| `entities/template.aggregate.ts` | The **Template aggregate root** — the central domain object. Contains all business rules (validation, creation, update, soft-delete). |
| `events/template-created.event.ts` | Domain event fired when a template is created                 |
| `events/template-updated.event.ts` | Domain event fired when a template is updated                 |
| `events/template-deleted.event.ts` | Domain event fired when a template is deleted                 |
| `repositories/template.repository.ts` | **Abstract class** defining what the repository must do (interface). The domain doesn't know about PostgreSQL or TypeORM. |

### `src/templates/application/` — The Use Cases

This is where "what the system does" lives. It orchestrates domain objects.

| Folder                  | What It Does                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| `commands/`             | Command classes (data containers for write operations)                    |
| `commands/handlers/`    | Command handlers (execute the write logic)                                |
| `queries/`              | Query classes (data containers for read operations)                       |
| `queries/handlers/`     | Query handlers (execute the read logic)                                   |
| `events/`               | Event handlers (publish domain events to NATS JetStream)                  |
| `services/`             | Application services (e.g., `TemplateRendererService` for rendering templates with variables) |

### `src/templates/infrastructure/` — The Technical Implementations

This layer depends on frameworks and libraries. It's the "how" behind the "what".

| Folder                          | What It Does                                                       |
| ------------------------------- | ------------------------------------------------------------------ |
| `grpc/`                         | gRPC controllers — receive incoming gRPC calls, dispatch to command/query bus |
| `grpc/template.grpc-mapper.ts`  | Converts between domain aggregates and gRPC proto DTOs             |
| `persistence/entities/`         | TypeORM entity — maps to the `templates` DB table                  |
| `persistence/repositories/`     | Concrete repository implementation using TypeORM                   |
| `persistence/migrations/`       | Database migrations (schema changes)                               |

### `proto/generated/`

Auto-generated TypeScript types from Protocol Buffer definitions. These define the gRPC contract:

| File                      | What It Defines                                   |
| ------------------------- | ------------------------------------------------- |
| `template_commands.ts`    | CreateTemplate, UpdateTemplate, DeleteTemplate     |
| `template_queries.ts`     | GetTemplate, ListTemplates, RenderTemplate, etc.   |
| `common.ts`               | Shared types (TemplateDTO, TemplateType enum, etc.)|

## Why This Structure?

The separation into domain / application / infrastructure follows **DDD layering**:

- **Domain** can be tested without a database or framework
- **Application** orchestrates but doesn't know how data is stored
- **Infrastructure** can be swapped (e.g., replace PostgreSQL with MongoDB) without touching business logic

The **dependency rule**: outer layers depend on inner layers, never the reverse. Domain knows nothing about infrastructure.
