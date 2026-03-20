# Winaity Template Builder

A multi-tenant SaaS platform for building and managing email templates, invoices (factures), and contracts — with drag & drop, MJML, and AI-powered generation.

## Architecture

```
Frontend (Next.js)
    │ REST
    ▼
API Gateway (port 3000)
    │ gRPC
    ├──► Auth Service (port 50055)
    └──► Template Service (port 50054)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, Framer Motion |
| API Gateway | NestJS (REST → gRPC proxy, JWT middleware) |
| Auth Service | NestJS, CQRS, gRPC, TypeORM, PostgreSQL |
| Template Service | NestJS, CQRS, gRPC, TypeORM, PostgreSQL |
| Databases | PostgreSQL (auth_db, templates_db) |
| Infrastructure | Docker Compose, Consul, NATS, MinIO |

## Features

### Auth Service
- Register (create organization + admin)
- Login (JWT-based authentication)
- Invite users (token-based, 15min expiry)
- Accept invite (join organization)
- Get me (user profile)
- Update profile
- List members
- Validate token

### Template Service
- Create, update, delete templates
- List templates (paginated, filtered by tenant)
- Duplicate templates
- Render templates (variable substitution)
- Template types: email, facture, contrat

### Multi-Tenancy
- Each organization (tenant) has isolated data
- Admin invites members with role-based access (admin, editor, member)
- Templates are scoped per tenant

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (local) or use Docker

### Run with Docker Compose

```bash
docker compose up -d
```

### Run locally (development)

```bash
# Auth Service
cd auth-service && npm install && npm run start:dev

# Template Service
cd template-service && npx nest start --watch

# API Gateway
cd api-gateway && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

### Ports

| Service | Port |
|---|---|
| Frontend | 3001 |
| API Gateway | 3000 |
| Auth Service (gRPC) | 50055 |
| Template Service (gRPC) | 50054 |
| PostgreSQL (Docker) | 5433 |
| Consul Dashboard | 8500 |
| MinIO Console | 9001 |
| NATS Monitoring | 8222 |

## Project Structure

```
winaity-template-builder/
├── frontend/           # Next.js frontend
├── api-gateway/        # REST → gRPC proxy
├── auth-service/       # Authentication microservice
├── template-service/   # Template management microservice
├── packages/
│   ├── proto/          # gRPC proto definitions
│   └── shared-kernel/  # Shared utilities
├── docker-compose.yml
└── init-db.sql
```
