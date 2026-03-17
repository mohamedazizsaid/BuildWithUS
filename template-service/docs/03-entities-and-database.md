# Entities & Database

## The Template — The Only Entity

This service has one entity: **Template**. But it exists in two forms:

1. **Domain Aggregate** (`template.aggregate.ts`) — The business object with rules and behavior
2. **ORM Entity** (`template.orm-entity.ts`) — The database row mapping

### Why Two Versions of the Same Thing?

The domain aggregate carries **business logic** (validation, events). The ORM entity is just a **data container** that TypeORM knows how to persist. The repository converts between them.

```
Template Aggregate  ──toPrimitives()──►  ORM Entity  ──TypeORM──►  PostgreSQL
PostgreSQL  ──TypeORM──►  ORM Entity  ──reconstitute()──►  Template Aggregate
```

## Database Schema

**Table name**: `templates`

| Column            | Type         | Nullable | Default  | Notes                           |
| ----------------- | ------------ | -------- | -------- | ------------------------------- |
| `id`              | UUID         | No       | —        | Primary key                     |
| `name`            | VARCHAR(255) | No       | —        | Template name                   |
| `description`     | TEXT         | Yes      | —        | Optional description            |
| `type`            | VARCHAR(50)  | No       | —        | `email`, `sms`, or `whatsapp`   |
| `subject`         | VARCHAR(500) | Yes      | —        | Email subject line              |
| `content`         | TEXT         | No       | —        | Main template body              |
| `variables`       | TEXT[]       | No       | `{}`     | Extracted `{{variable}}` names  |
| `channels`        | JSONB        | Yes      | —        | Target channels array           |
| `channel_contents`| JSONB        | Yes      | —        | Per-channel content variations   |
| `variants`        | JSONB        | No       | `{}`     | Alternative content versions     |
| `version`         | INTEGER      | No       | `0`      | Optimistic locking counter       |
| `usage_count`     | INTEGER      | No       | `0`      | How many times used (analytics)  |
| `created_at`      | TIMESTAMP    | No       | `NOW()`  | Creation time                    |
| `updated_at`      | TIMESTAMP    | No       | `NOW()`  | Last update time                 |
| `deleted_at`      | TIMESTAMP    | Yes      | —        | Soft delete marker               |

### Indexes

| Index Name                    | Columns              | Purpose                              |
| ----------------------------- | -------------------- | ------------------------------------ |
| `idx_templates_type`          | `type`               | Fast filtering by type (excludes deleted) |
| `idx_templates_created`       | `created_at DESC`    | Recent templates first               |
| `idx_templates_deleted`       | `deleted_at`         | Soft delete lookups                  |
| `idx_templates_name_search`   | `name` (GIN)         | Full-text search on name             |
| `idx_templates_usage_count`   | `usage_count DESC`   | Popular templates ranking            |

## Domain Aggregate Properties

The `Template` aggregate enriches the raw DB data with:

### Value Objects (from shared-kernel)

| Value Object           | Wraps       | Validation                              |
| ---------------------- | ----------- | --------------------------------------- |
| `TemplateId`           | UUID string | Must be valid UUID                      |
| `TemplateName`         | string      | Required, max 255 chars                 |
| `TemplateDescription`  | string      | Optional                                |
| `TemplateSubject`      | string      | Required for email, forbidden otherwise |
| `TemplateContent`      | string      | Required, non-empty                     |
| `CampaignType`         | enum        | `email`, `sms`, or `whatsapp`           |

### Business Rules

1. **Subject is required for email** — If type is `email`, you must provide a subject. If type is `sms` or `whatsapp`, subject must be empty.
2. **Variables are auto-extracted** — Any `{{variableName}}` in content is automatically parsed and stored in the `variables` array.
3. **Soft delete only** — Templates are never physically deleted. The `deleted_at` column is set instead.
4. **Optimistic locking** — The `version` field prevents concurrent update conflicts.
5. **Channels default to type** — If you don't specify channels, it defaults to an array containing just the template's type.

### Factory Methods

```
Template.create(props)       → New template with validation + raises TemplateCreatedEvent
Template.reconstitute(props) → Rebuild from DB (no events, no validation)
template.update(changes)     → Partial update + raises TemplateUpdatedEvent
template.delete()            → Sets deletedAt + raises TemplateDeletedEvent
```

## Multi-Channel Content

A single template can have different content per channel:

```json
{
  "channelContents": {
    "email": {
      "subject": "Welcome!",
      "body": "<h1>Welcome {{name}}</h1>",
      "format": "html"
    },
    "sms": {
      "body": "Welcome {{name}}! Reply STOP to opt out.",
      "format": "text"
    },
    "whatsapp": {
      "body": "*Welcome* {{name}}!",
      "mediaUrl": "https://example.com/image.png",
      "format": "markdown"
    }
  }
}
```

## Template Variables

Variables use the `{{variableName}}` syntax:

```
Hello {{firstName}}, your order {{orderId}} has been shipped.
```

Extracted variables: `["firstName", "orderId"]`

During rendering, a map of `{ firstName: "Ahmed", orderId: "12345" }` replaces the placeholders.

## Migrations

Located in `src/templates/infrastructure/persistence/migrations/`.

| Migration                         | What It Does            |
| --------------------------------- | ----------------------- |
| `1700000000000-InitialSchema.ts`  | Creates the `templates` table with all columns and indexes |

### Running Migrations

```bash
npm run migration:run        # Apply pending migrations
npm run migration:revert     # Rollback last migration
npm run migration:show       # View applied/pending migrations
npm run migration:generate   # Auto-generate from entity changes
npm run migration:create     # Create empty migration file
```
