# Simple Logger API Reference

This document describes the REST endpoints exposed by Logger. The API is powered by Express, uses JSON payloads encoded in UTF-8, and is served under the base URL `http://localhost:3000/api` in local environments.

## 1. General information

- Authentication: `Authorization: Bearer <token>` header (except for public log ingestion and `/health`).
- Safeguards: global rate limiting and IP allowlist (default limit 120 requests/minute, adjustable via `/api/settings/rate-limit`). Requests flagged by the allowlist and projects with the `whitelist` or `docker` access level bypass the limiter, and IPs placed on the blacklist are blocked until the entry is removed.
- Date format: ISO 8601 (UTC).
- Swagger: `api/swaggerapi/openapi.yaml` or the Swagger UI service from `docker-compose.dev.yml`.

## 2. Authentication

### 2.1 POST `/auth/login`

Retrieve an administrator token.

**Request**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "secret"
}
```

**Response `200 OK`**
```json
{
  "token": "<jwt-like-token>",
  "expiresIn": 3600
}
```

**Errors**
- `401 Unauthorized` – invalid credentials.
- `423 Locked` – IP temporarily blocked after multiple failures.

## 3. Projects `/projects`

### 3.1 POST `/`
Create a project (token required).

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Orders Service",
  "description": "Order processing",
  "logFormat": {"level": "string", "message": "string"},
  "defaultTags": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
  "customTags": ["PAYMENT"],
  "accessLevel": "global",
  "telegramNotify": {
    "enabled": true,
    "recipients": [{"chatId": "123456", "tags": ["ERROR", "CRITICAL"]}],
    "antiSpamInterval": 30
  },
  "debugMode": false,
  "maxLogEntries": 0
}
```

**Response `201 Created`** – project object containing the `uuid`.

Use `maxLogEntries` to cap the stored log count per project. Set it to `0` to disable the limit. Logger Core always operates without a cap.

### 3.2 GET `/`
List projects (newest first).

### 3.3 GET `/:uuid`
Fetch a project by UUID. Returns `404` if not found.

### 3.4 PUT `/:uuid`
Update a project. Changing the UUID triggers `400 Bad Request`.

### 3.5 DELETE `/:uuid`
Remove a project together with related logs and ping services (except `logger-system`).

**Response `200 OK`**
```json
{
  "message": "Проект удален",
  "deletedLogs": 120,
  "deletedPingServices": 3
}
```

### 3.6 GET `/:uuid/logs`
Return logs for a specific project. Supported query parameters: `level`, `text`, `tag`, `user`, `ip`, `service`, `startDate`, `endDate`, `logId`.

### 3.7 GET `/:uuid/telegram`
Returns Telegram integration status: whether notifications are enabled, current anti-spam interval, recipients list, and ready-to-copy commands.

**Response `200 OK`**
```json
{
  "projectUuid": "0a5c9ae6-9c2c-4fb3-a471-0c2c1163c111",
  "enabled": true,
  "antiSpamInterval": 30,
  "recipients": [
    { "chatId": "123456789", "tags": ["CRITICAL"] }
  ],
  "commands": {
    "subscribe": "ADD:0a5c9ae6-9c2c-4fb3-a471-0c2c1163c111",
    "unsubscribe": "DELETE:0a5c9ae6-9c2c-4fb3-a471-0c2c1163c111"
  },
  "bot": {
    "url": "https://t.me/loggerbot",
    "source": "telegram",
    "botActive": true
  }
}
```

When notifications are disabled the `commands` fields are `null`.

### 3.8 DELETE `/:uuid/telegram/recipients/:chatId`
Removes a specific recipient and sends them an unsubscribe message. The updated project snapshot is returned in the response.

**Response `200 OK`**
```json
{
  "message": "Recipient removed",
  "chatId": "123456789",
  "project": {
    "uuid": "0a5c9ae6-9c2c-4fb3-a471-0c2c1163c111",
    "name": "Orders Service",
    "telegramCommands": {
      "subscribe": "ADD:0a5c9ae6-9c2c-4fb3-a471-0c2c1163c111",
      "unsubscribe": "DELETE:0a5c9ae6-9c2c-4fb3-a471-0c2c1163c111"
    },
    "telegramBot": {
      "url": "https://t.me/loggerbot",
      "source": "telegram",
      "botActive": true
    }
  }
}
```

If the recipient is missing the API returns `404 Not Found` with an error payload.

## 4. Ping services `/projects/{uuid}/ping-services`

### 4.1 POST `/`
Register a monitoring check.

```http
POST /api/projects/{uuid}/ping-services
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Billing health-check",
  "url": "https://billing.example.com/health",
  "interval": 60,
  "telegramTags": ["PING_DOWN"]
}
```

### 4.2 GET `/`
List ping services for the project.

### 4.3 POST `/check`
Run a manual availability probe. Returns the latest check result.

### 4.4 PUT `/:serviceId`
Update ping service parameters. You may send only the fields that should change. A health check is triggered after saving.

```http
PUT /api/projects/{uuid}/ping-services/{serviceId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "interval": 120,
  "telegramTags": ["PING_DOWN", "CRITICAL"]
}
```

The `200 OK` response returns the updated service object.

### 4.5 DELETE `/:serviceId`
Remove a ping service from the project. The response contains the identifier of the removed service.

```http
DELETE /api/projects/{uuid}/ping-services/{serviceId}
Authorization: Bearer <token>
```

**Response `200 OK`**
```json
{
  "message": "Ping service deleted",
  "serviceId": "6650f47f9d3ab00015a81234"
}
```

## 5. Logs `/logs`

### 5.1 POST `/`
Public ingestion endpoint for project logs.

```http
POST /api/logs
Content-Type: application/json

{
  "uuid": "<uuid>",
  "log": {
    "level": "ERROR",
    "message": "Payment error",
    "tags": ["PAYMENT"],
    "timestamp": "2024-05-20T10:00:00.000Z",
    "metadata": {
      "ip": "10.0.0.5",
      "service": "billing",
      "user": "user-1",
      "extra": {"orderId": "A-42"}
    }
  }
}
```

The service always records the originating IP in the `clientIP` field, regardless of the metadata supplied by the client. The
`201 Created` response also echoes the current per-project rate limit so SDKs can adjust automatically.

**Response `201 Created`**
```json
{
  "_id": "6650f1c79b9af0001b0d1234",
  "projectUuid": "<uuid>",
  "level": "ERROR",
  "message": "Payment failed",
  "tags": ["PAYMENT"],
  "timestamp": "2024-05-20T10:00:00.000Z",
  "metadata": {
    "ip": "10.0.0.5",
    "service": "billing",
    "user": "user-1",
    "chatId": "532184920",
    "userId": "532184920",
    "projectUuid": "da3c9c2a-07f5-4b39-8bd6-74ae3de487d1",
    "projectSubscriptions": [
      "da3c9c2a-07f5-4b39-8bd6-74ae3de487d1",
      "e9f1db85-0b9f-4890-8c0a-e0f249c66721"
    ],
    "extra": {"orderId": "A-42"}
  },
  "clientIP": "203.0.113.10",
  "rateLimitPerMinute": 120
}
```

Fields `metadata.chatId`, `metadata.userId`, and `metadata.projectUuid` are populated automatically for Telegram events. When a chat subscribes to several projects the response also includes `metadata.projectSubscriptions` with every related UUID.

When Telegram notifications are enabled, each alert starts with `<Project name> (<UUID>)` so operators can immediately tell which project triggered the message.

Invalid payloads are recorded inside the `logger-system` project.

Other responses:

- `403 Forbidden` — external attempt to ingest into Logger Core.
- `409 Conflict` — project reached its `maxLogEntries` limit (payload includes `code = LOG_LIMIT_EXCEEDED` and the system writes a `LOG_CAP`/`ALERT` entry into Logger Core).

### 5.2 GET `/`
Filter logs using the same parameters as `/:uuid/logs`. Requires a token.

### 5.3 DELETE `/:uuid`
Delete logs for a project. The request body can contain filters (`level`, `tag`, `startDate`, `endDate`, `logId`).

## 6. Settings `/settings`

### 6.1 GET `/whitelist`
Return all IP addresses that bypass the global rate limit. Each entry includes the optional description, creation timestamp, and an `isProtected` flag for records injected via the `ADMIN_IP` environment variable.【F:api/src/api/services/whitelist.ts†L31-L96】

### 6.2 POST `/whitelist`
Create or update an allowlist entry.

```http
POST /api/settings/whitelist
Authorization: Bearer <token>
Content-Type: application/json

{
  "ip": "192.168.0.10",
  "description": "VPN"
}
```

### 6.3 DELETE `/whitelist/:ip`
Remove an IP address from the allowlist. Deleting the administrator IP configured through `ADMIN_IP` returns `403 Forbidden` with the code `WHITELIST_PROTECTED` while the variable is present.【F:api/src/api/controllers/settingsController.ts†L55-L65】

### 6.4 GET `/blacklist`
Return active and scheduled IP blocks.

**Response `200 OK`**
```json
[
  {
    "_id": "6650f669d4b5c00017da5678",
    "ip": "203.0.113.10",
    "reason": "Suspicious activity",
    "expiresAt": "2024-09-01T12:00:00.000Z",
    "createdAt": "2024-08-01T08:15:00.000Z",
    "updatedAt": "2024-08-15T08:15:00.000Z"
  }
]
```

### 6.5 POST `/blacklist`
Create a new blacklist entry. The reason is mandatory; set `expiresAt` to `null` for a permanent ban.

### 6.6 PUT `/blacklist/:id`
Update an existing block — you may change the IP, reason, or expiration date.

### 6.7 DELETE `/blacklist/:id`
Delete a block and immediately restore access for the IP.

### 6.8 GET `/rate-limit`
Return the current requests-per-minute cap (120 by default).

**Response `200 OK`**
```json
{
  "rateLimitPerMinute": 120
}
```

### 6.9 PUT `/rate-limit`
Change the global API requests-per-minute cap. Projects with the `whitelist` or `docker` access level are exempt from the limiter.

```http
PUT /api/settings/rate-limit
Authorization: Bearer <token>
Content-Type: application/json

{
  "rateLimitPerMinute": 200
}
```

The response repeats the new limit value.

### 6.10 GET `/telegram-status`
Check whether the Telegram bot is configured and polling.

```http
GET /api/settings/telegram-status
Authorization: Bearer <token>
```

**Response `200 OK`**

```json
{
  "tokenProvided": true,
  "botStarted": true
}
```

### 6.11 GET `/telegram-url`
Return the public Telegram bot link together with metadata.

```http
GET /api/settings/telegram-url
Authorization: Bearer <token>
```

**Response `200 OK`**

```json
{
  "url": "https://t.me/devinfotestbot",
  "source": "telegram",
  "botActive": true
}
```

The `url` field becomes `null` if the link cannot be resolved. The `source` value is one of `env`, `telegram`, `inactive`, `unknown` and signals where the link originated. The `botActive` flag indicates whether the bot is running and able to reach the Telegram Bot API.

## 7. System endpoints

- `GET /health` – service readiness probe (without the `/api` prefix).

## 8. Error handling

- `400 Bad Request` – validation errors (details in `errors` or `message`).
- `401 Unauthorized` – missing or invalid token.
- `403 Forbidden` – IP not in the whitelist or attempt to delete the system project.
- `404 Not Found` – entity not found.
- `429 Too Many Requests` – rate limiter triggered.
- `500 Internal Server Error` – unexpected server error.

## 9. Developer resources

- Browse route definitions in `api/src/api/routes`.
- Controller logic and types live in `api/src/api/controllers`.
- API integration tests reside in `api/test`.

This reference complements `docs/en/api.md` with detailed examples and response codes.
