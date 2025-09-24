# Logger REST API

The backend lives in `./api` and exposes a REST API for managing logging projects and ingesting events. All endpoints are prefixed with `/api`; the default local base URL is `http://localhost:3000/api`.

## Basics

- Payload format – `application/json`.
- Timestamps are ISO 8601 (UTC).
- Administrative requests require `Authorization: Bearer <token>`.
- Middleware such as `rateLimiter` and `ipWhitelist` reside in `src/api/middlewares` and are wired in `app.ts`.

## Authentication

### POST `/auth/login`

Returns a token used for administrative endpoints.

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "secret"
}
```

Successful response `200 OK`:

```json
{
  "token": "<jwt-like-token>"
}
```

After several failed attempts the caller IP is locked for one hour.

## Project management `/projects`

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/` | Create a project and return its UUID. |
| `GET` | `/` | List all projects. |
| `GET` | `/:uuid` | Fetch project details. |
| `PUT` | `/:uuid` | Update a project by UUID. |
| `DELETE` | `/:uuid` | Remove a project together with its logs and ping services. |
| `GET` | `/:uuid/logs` | Retrieve project logs with filters. |
| `POST` | `/:uuid/ping-services` | Register a ping service. |
| `GET` | `/:uuid/ping-services` | List ping services. |
| `POST` | `/:uuid/ping-services/check` | Trigger a manual ping check. |

Example request:

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

The `201 Created` response contains the project with its generated `uuid`.

Deleting a project returns the number of removed records:

```json
{
  "message": "Проект удален",
  "deletedLogs": 120,
  "deletedPingServices": 3
}
```

## Log ingestion `/logs`

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/` | Ingest a log by project UUID (public endpoint). |
| `GET` | `/` | Filter logs (requires a token). |
| `DELETE` | `/:uuid` | Bulk deletion by filters or a single log removal (requires a token). |

Example payload:

```http
POST /api/logs
Content-Type: application/json

{
  "uuid": "<project uuid>",
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

Invalid payloads are captured as incidents inside the system project `logger-system`.

Log filtering accepts `uuid`, `level`, `text`, `tag`, `user`, `ip`, `service`, `startDate`, `endDate`, `logId`:

```http
GET /api/logs?uuid=<uuid>&level=ERROR&tag=PAYMENT&startDate=2024-05-01
Authorization: Bearer <token>
```

## Security settings `/settings`

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/whitelist` | Retrieve the IP whitelist. |
| `POST` | `/whitelist` | Add an IP address. |
| `DELETE` | `/whitelist/:ip` | Remove an IP address. |

Sample request:

```http
POST /api/settings/whitelist
Authorization: Bearer <token>
Content-Type: application/json

{
  "ip": "192.168.0.10",
  "description": "VPN"
}
```

## Swagger and OpenAPI

The official API description lives in `api/swaggerapi/openapi.yaml`. You can:

1. Open the file in any Swagger-compatible editor or validator.
2. Run the bundled Swagger UI container defined in `docker-compose.dev.yml`:
   ```bash
   cd api
   docker compose -f docker-compose.dev.yml up swagger
   ```
   Once running, the UI is available at `http://localhost:3001` and allows live requests.

Routes (`src/api/routes`) and controllers (`src/api/controllers`) are the authoritative source for keeping the specification up to date.

## Quick start

```bash
cd api
npm install
npm run build
npm start
```

Use `npm run dev` for development and `npm test` to execute the Jest suite. Docker files `docker-compose.dev.yml` and `docker-compose.prod.yml` ship ready-to-use setups with MongoDB and Swagger UI.
