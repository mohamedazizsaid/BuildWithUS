# API Endpoints (gRPC)

This service exposes **no REST API**. Everything goes through gRPC. There are two gRPC services:

- **TemplateCommandService** — Write operations (create, update, delete)
- **TemplateQueryService** — Read operations (get, list, search, render, health)

## Commands (Write Operations)

### 1. CreateTemplate

Creates a new template.

| Field            | Type              | Required | Notes                                |
| ---------------- | ----------------- | -------- | ------------------------------------ |
| `userId`         | string            | Yes      | Who's creating it                    |
| `name`           | string            | Yes      | Template name (max 255 chars)        |
| `description`    | string            | No       | Optional description                 |
| `type`           | TemplateType enum  | Yes      | EMAIL (1), SMS (2), WHATSAPP (3)     |
| `subject`        | string            | For email| Required for email, empty otherwise  |
| `content`        | string            | Yes      | Template body                        |
| `channels`       | TemplateType[]    | No       | Defaults to `[type]`                 |
| `channelContents`| ChannelContent[]  | No       | Per-channel variations               |

**Response**: `{ success, message, template }` where template is the full TemplateDTO.

**What happens internally**:
1. gRPC controller receives the request
2. Dispatches `CreateTemplateCommand` via CommandBus
3. Handler creates value objects, validates business rules
4. `Template.create()` builds the aggregate and raises `TemplateCreatedEvent`
5. Repository saves to PostgreSQL
6. Event handler publishes to NATS JetStream

---

### 2. UpdateTemplate

Updates an existing template. Only sends fields you want to change.

| Field            | Type              | Required | Notes                           |
| ---------------- | ----------------- | -------- | ------------------------------- |
| `id`             | string            | Yes      | Template UUID to update         |
| `userId`         | string            | Yes      | Who's updating it               |
| `name`           | string            | No       | Empty string = no change        |
| `description`    | string            | No       | Empty string = no change        |
| `subject`        | string            | No       | Empty string = no change        |
| `content`        | string            | No       | Empty string = no change        |
| `channels`       | TemplateType[]    | No       | Empty = no change               |
| `channelContents`| ChannelContent[]  | No       | Empty = no change               |

**Important**: In gRPC/proto, you can't send `null`. Empty string (`""`) means "don't change this field".

**Response**: `{ success, message, template }`

---

### 3. DeleteTemplate

Soft-deletes a template (sets `deleted_at`, doesn't remove the row).

| Field    | Type   | Required | Notes              |
| -------- | ------ | -------- | ------------------ |
| `id`     | string | Yes      | Template UUID      |
| `userId` | string | Yes      | Who's deleting it  |

**Response**: `{ success, message }`

---

## Queries (Read Operations)

### 1. HealthCheck

Simple health probe. Used by Consul and gRPC health checks.

**Request**: Empty
**Response**: `{ status: "serving", serviceName: "template-service", version: "1.0.0" }`

---

### 2. GetTemplate

Fetch a single template by ID.

| Field    | Type   | Required | Notes         |
| -------- | ------ | -------- | ------------- |
| `id`     | string | Yes      | Template UUID |
| `userId` | string | No       | Optional      |

**Response**: `{ template }` — Full TemplateDTO.

**Throws**: `NotFoundException` if not found or soft-deleted.

---

### 3. ListTemplates

Paginated listing with filtering and search.

| Field       | Type   | Required | Default     | Notes                              |
| ----------- | ------ | -------- | ----------- | ---------------------------------- |
| `page`      | int32  | No       | 1           | Page number (1-indexed)            |
| `limit`     | int32  | No       | 20          | Items per page (max 100)           |
| `type`      | string | No       | —           | Filter: `email`, `sms`, `whatsapp` |
| `sortBy`    | string | No       | `createdAt` | Column to sort by                  |
| `ascending` | bool   | No       | false       | Sort direction                     |
| `search`    | string | No       | —           | Full-text search on name/desc      |
| `userId`    | string | No       | —           | Optional                           |

**Response**:
```
{
  templates: TemplateDTO[],
  pagination: {
    total: 42,
    page: 1,
    limit: 20,
    totalPages: 3,
    hasNext: true,
    hasPrevious: false
  }
}
```

---

### 4. GetPopularTemplates

Returns most-used templates, sorted by usage count.

| Field    | Type   | Required | Default | Notes                     |
| -------- | ------ | -------- | ------- | ------------------------- |
| `limit`  | int32  | No       | 3       | Max 10                    |
| `type`   | string | No       | —       | Filter by template type   |
| `userId` | string | No       | —       | Optional                  |

**Response**: `{ templates: TemplateDTO[] }` sorted by `usageCount DESC`.

---

### 5. RenderTemplate

Renders a template by replacing `{{variables}}` with actual values.

| Field       | Type                  | Required | Notes                              |
| ----------- | --------------------- | -------- | ---------------------------------- |
| `id`        | string                | Yes      | Template UUID                      |
| `variables` | map<string, string>   | No       | Key-value pairs for substitution   |
| `userId`    | string                | No       | Optional                           |

**Response**:
```
{
  renderedSubject: "Welcome Ahmed!",
  renderedContent: "<h1>Welcome Ahmed!</h1><p>Your order 12345 is ready.</p>",
  variablesUsed: ["firstName", "orderId"]
}
```

**Rendering behavior by channel**:

| Channel   | Format Support         | Special Behavior                                  |
| --------- | ---------------------- | ------------------------------------------------- |
| Email     | HTML, Markdown, Text   | Returns both HTML and text versions               |
| SMS       | Text only              | Strips markdown, truncates to 1600 chars, adds opt-out |
| WhatsApp  | WhatsApp markdown      | Converts to WhatsApp formatting (*bold*, _italic_) |

---

## The TemplateDTO (What Responses Look Like)

Every template response uses this shape:

```
{
  id: "uuid-string",
  name: "Welcome Email",
  description: "Sent to new users",
  type: 1,                          // 1=EMAIL, 2=SMS, 3=WHATSAPP
  subject: "Welcome {{name}}!",
  content: "<h1>Hello {{name}}</h1>",
  variables: ["name"],
  channels: [1],                    // array of TemplateType enums
  channelContents: [
    { channel: "email", subject: "...", body: "...", format: "html" }
  ],
  variants: {},
  version: 1,
  usageCount: 42,
  createdAt: 1700000000,            // Unix seconds
  updatedAt: 1700000500
}
```

## Error Handling

Errors come back as gRPC status codes:

| Scenario                | gRPC Code       |
| ----------------------- | --------------- |
| Template not found      | NOT_FOUND       |
| Invalid input           | INVALID_ARGUMENT|
| Business rule violation | FAILED_PRECONDITION |
| Server error            | INTERNAL        |
