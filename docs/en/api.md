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
| `PUT` | `/:uuid/ping-services/:serviceId` | Update ping service parameters. |
| `DELETE` | `/:uuid/ping-services/:serviceId` | Remove a ping service from the project. |
| `POST` | `/:uuid/ping-services/check` | Trigger a manual ping check. |
| `GET` | `/:uuid/telegram` | Retrieve Telegram integration state and ready-to-copy commands. |
| `DELETE` | `/:uuid/telegram/recipients/:chatId` | Remove a specific recipient and notify them. |

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

Every project response also includes a `telegramCommands` block with commands such as `ADD:<UUID>` and `DELETE:<UUID>`, together with the `telegramBot` object that describes the current bot URL. When notifications are disabled the commands are `null`.

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
| `GET` | `/rate-limit` | Inspect the current requests-per-minute cap. |
| `PUT` | `/rate-limit` | Change the requests-per-minute cap. |
| `GET` | `/telegram-status` | Verify that the Telegram bot is configured and polling. |
| `GET` | `/telegram-url` | Retrieve the public Telegram bot link together with its source. |

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

To tweak the rate limiter send `PUT /api/settings/rate-limit` with a JSON payload like `{ "rateLimitPerMinute": 200 }`.

To confirm that the Telegram bot is online, call `GET /api/settings/telegram-status`. A `200 OK` response returns `tokenProvided` and `botStarted` flags that reflect the presence of `BOT_API_KEY` and the polling state:

```json
{
  "tokenProvided": true,
  "botStarted": true
}
```

Fetch the public bot link with `GET /api/settings/telegram-url`. When the `BOT_URL` environment variable stores a valid `https://t.me/<botname>` link it is returned verbatim. Otherwise, if the bot is running, the service requests the username from Telegram Bot API and builds the URL automatically. The response indicates the data source and whether the bot is active:

```json
{
  "url": "https://t.me/devinfotestbot",
  "source": "telegram",
  "botActive": true
}
```

If the link cannot be determined (for example the bot is offline or lacks a username) the `url` field becomes `null` and `source` switches to `inactive` or `unknown`.

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
