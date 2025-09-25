# Simple Logger API Reference

This document describes the REST endpoints exposed by Logger. The API is powered by Express, uses JSON payloads encoded in UTF-8, and is served under the base URL `http://localhost:3000/api` in local environments.

## 1. General information

- Authentication: `Authorization: Bearer <token>` header (except for public log ingestion and `/health`).
- Safeguards: global rate limiting and IP whitelist (default limit 120 requests/minute, adjustable via `/api/settings/rate-limit`).
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
  "debugMode": false
}
```

**Response `201 Created`** – project object containing the `uuid`.

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

Invalid payloads are recorded inside the `logger-system` project.

### 5.2 GET `/`
Filter logs using the same parameters as `/:uuid/logs`. Requires a token.

### 5.3 DELETE `/:uuid`
Delete logs for a project. The request body can contain filters (`level`, `tag`, `startDate`, `endDate`, `logId`).

## 6. Settings `/settings`

### 6.1 GET `/`
Retrieve the IP whitelist.

### 6.2 POST `/`
Add an IP address.

```http
POST /api/settings/whitelist
Authorization: Bearer <token>
Content-Type: application/json

{
  "ip": "192.168.0.10",
  "description": "VPN"
}
```

### 6.3 DELETE `/:ip`
Remove an IP address from the whitelist.

### 6.4 GET `/rate-limit`
Return the current requests-per-minute cap (120 by default).

**Response `200 OK`**
```json
{
  "rateLimitPerMinute": 120
}
```

### 6.5 PUT `/rate-limit`
Change the global API requests-per-minute cap.

```http
PUT /api/settings/rate-limit
Authorization: Bearer <token>
Content-Type: application/json

{
  "rateLimitPerMinute": 200
}
```

The response repeats the new limit value.

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
