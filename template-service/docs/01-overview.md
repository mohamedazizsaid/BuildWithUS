# Template Service — Overview

## What Is This?

A backend that does **CRUD for message templates** (email, SMS, WhatsApp). That's it at its core. If you've built a REST API with controllers, services, and a database — this is the same idea, just organized differently.

## If You Know REST, You Already Know 80% of This

In a typical REST API you'd have:

```
POST   /templates       → Create a template
PUT    /templates/:id   → Update a template
DELETE /templates/:id   → Delete a template
GET    /templates/:id   → Get one template
GET    /templates       → List all templates
```

This service has the **exact same operations**. The only difference is **how** they're called.

### REST vs gRPC — The Only Real Difference

| REST (what you know)                         | gRPC (what this project uses)                    |
| -------------------------------------------- | ------------------------------------------------ |
| HTTP requests (`GET /templates`)             | Function calls over a binary protocol             |
| JSON bodies                                  | Protocol Buffers (typed, like JSON but stricter)   |
| Swagger/OpenAPI defines the contract         | `.proto` files define the contract                 |
| Anyone can call it (browser, Postman, curl)  | Only other backend services call it                |

**Why gRPC instead of REST?** This is a **microservice** — it's not called by a frontend or browser. It's called by other backend services. gRPC is faster and type-safe for service-to-service communication. Think of it as services calling each other's functions directly instead of making HTTP requests.

**You don't need to deeply understand gRPC to work on this.** The gRPC controllers in `infrastructure/grpc/` work exactly like REST controllers — they receive a request, do something, return a response.

## The Folder Structure in REST Terms

If this were a REST API, you'd probably have:

```
src/
├── controllers/     ← handles incoming requests
├── services/        ← business logic
├── entities/        ← database models
└── dto/             ← request/response shapes
```

This project has the same things, just **split into 3 folders** (called "layers"):

```
src/templates/
├── infrastructure/grpc/         ← same as controllers/
├── application/commands/        ← same as services/ (for create/update/delete)
├── application/queries/         ← same as services/ (for get/list)
├── domain/entities/             ← same as entities/
└── infrastructure/persistence/  ← same as your TypeORM repo/entity files
```

**Why the split?** It's an architecture pattern called DDD. The benefit is that your business rules (domain/) don't depend on your framework or database. You could swap PostgreSQL for MongoDB and only change the `persistence/` folder. You don't need to love it — just know where things live.

## CQRS — Fancy Name, Simple Idea

CQRS just means: **separate the code that writes data from the code that reads data**.

Instead of one service with `create()`, `update()`, `findAll()` all together, this project splits them:

- **Commands** = write operations → `application/commands/`
  - `CreateTemplateCommand` + `CreateTemplateHandler`
  - `UpdateTemplateCommand` + `UpdateTemplateHandler`
  - `DeleteTemplateCommand` + `DeleteTemplateHandler`

- **Queries** = read operations → `application/queries/`
  - `GetTemplateQuery` + `GetTemplateHandler`
  - `ListTemplatesQuery` + `ListTemplatesHandler`
  - `RenderTemplateQuery` + `RenderTemplateHandler`

Each operation is its own class. It's more files than a single service, but each file does exactly one thing.

## Events — "Hey, Something Happened"

When a template is created/updated/deleted, this service **broadcasts an event** to a message queue (NATS). Other services can listen and react.

REST equivalent: imagine after your `POST /templates` succeeds, you make a webhook call saying "hey, a template was just created." That's all events are.

```
Template created → publishes "template.created" to NATS
Template updated → publishes "template.updated" to NATS
Template deleted → publishes "template.deleted" to NATS
```

Other microservices (analytics, notifications, etc.) can subscribe to these events.

## Key Tech Stack

| Technology     | REST Equivalent / Purpose                           |
| -------------- | --------------------------------------------------- |
| NestJS 11      | Same as any NestJS REST app                         |
| TypeScript 5.9 | Same                                                |
| PostgreSQL     | Same — the database                                 |
| TypeORM 0.3    | Same — ORM for queries and migrations               |
| gRPC           | Replaces HTTP/REST for service-to-service calls     |
| NATS JetStream | Like a webhook system / message queue for events    |
| Consul         | Like a phonebook — other services find this one here|
| shared-kernel  | Shared utility package (validation, base classes)   |

## Quick Start

```bash
npm install              # Install dependencies
npm run proto:generate   # Generate TypeScript types from proto files
npm run start:dev        # Run in development mode
npm run migration:run    # Apply database migrations
npm run build            # Build for production
```

## Environment Variables

See `.env.development` for defaults:

| Variable      | Default (dev)                          | Purpose                  |
| ------------- | -------------------------------------- | ------------------------ |
| GRPC_PORT     | 50054 (dev) / 50056 (prod)            | Like your REST port (3000) but for gRPC |
| DB_HOST       | dev-connect-winaity-postgres           | PostgreSQL host          |
| DB_PORT       | 5432                                   | PostgreSQL port          |
| DB_NAME       | templates_db                           | Database name            |
| NATS_URL      | nats://dev-connect-winaity-nats:4222   | Message queue server     |
| CONSUL_HOST   | dev-connect-winaity-consul             | Service discovery server |

## TL;DR

It's a CRUD backend for templates. Instead of REST it uses gRPC (because only other services call it). Instead of one big service file, each operation is its own command/query. When things change, events go to NATS so other services can react. That's the whole picture.
