# ApiClient

`ApiClient` is a thin wrapper around the Simple Logger REST API. It covers all endpoints defined in
`api/swaggerapi/openapi.yaml`, handles authentication, builds URLs, and normalises responses.

## Installation

```bash
npm install @simple-logger/ts-library
```

## Getting started

```ts
import { ApiClient } from '@simple-logger/ts-library';

const client = new ApiClient({ baseUrl: 'http://localhost:3000' });
await client.login({ username: 'admin', password: 'secret' });
```

### Constructor options

| Property | Type | Description |
| --- | --- | --- |
| `baseUrl` | `string` | API base URL (defaults to `http://localhost:3000`). |
| `token` | `string` | Optional admin token. |

`login` automatically stores the returned token and injects it into the `Authorization` header for
all protected endpoints.

## Token management

- `setToken(token)` — manually set the token.
- `clearToken()` — remove the stored token.
- `setBaseUrl(url)` — switch to another API host.

## API surface

### Health

- `health()` — `GET /health`, returns `{ status: 'ok' }`.

### Authentication

- `login(credentials)` — `POST /api/auth/login`, returns `{ token }` and stores it.

### Projects

- `createProject(payload)` — `POST /api/projects`.
- `listProjects()` — `GET /api/projects`.
- `getProject(uuid)` — `GET /api/projects/{uuid}`.
- `updateProject(uuid, payload)` — `PUT /api/projects/{uuid}`.
- `deleteProject(uuid)` — `DELETE /api/projects/{uuid}`, returns
  `{ message, deletedLogs, deletedPingServices }`.
- `getProjectLogs(uuid, filters?)` — `GET /api/projects/{uuid}/logs`, returns `ProjectLogResponse`.

### Ping services

- `listPingServices(uuid)` — `GET /api/projects/{uuid}/ping-services`.
- `createPingService(uuid, payload)` — `POST /api/projects/{uuid}/ping-services`.
- `checkPingServices(uuid)` — `POST /api/projects/{uuid}/ping-services/check`.

### Logs

- `filterLogs(filters)` — `GET /api/logs`. Requires `filters.uuid` and supports every filter from the
  OpenAPI specification.
- `ingestLog(payload)` — `POST /api/logs`, accepts unauthenticated log submissions and returns the stored entry with
  server-supplied `clientIP` and `rateLimitPerMinute` fields.
- `deleteLogs(uuid, filters?)` — `DELETE /api/logs/{uuid}`, returns `{ deleted }`.

### IP whitelist

- `getWhitelist()` — `GET /api/settings/whitelist`.
- `upsertWhitelistEntry(payload)` — `POST /api/settings/whitelist`.
- `deleteWhitelist(ip)` — `DELETE /api/settings/whitelist/{ip}`.

### API settings

- `getRateLimitSettings()` — `GET /api/settings/rate-limit`, returns `{ rateLimitPerMinute }`.
- `updateRateLimitSettings(payload)` — `PUT /api/settings/rate-limit`.
- `getTelegramStatus()` — `GET /api/settings/telegram-status`, returns `{ tokenProvided, botStarted }`.
- `getTelegramBotUrl()` — `GET /api/settings/telegram-url`, returns `{ url, source, botActive }`.

## Error handling

When the API responds with a non-success status, `ApiClient` throws an `ApiError` instance with
`message` and `status` properties populated from the response.

```ts
try {
  await client.getProject('unknown');
} catch (error) {
  console.error(error.message); // Not found
}
```

## End-to-end example

```ts
const client = new ApiClient();
await client.login({ username: 'admin', password: 'secret' });

const project = await client.createProject({
  name: 'Orders',
  description: 'Service logs',
  logFormat: {},
  defaultTags: ['INFO', 'ERROR'],
  customTags: [],
  accessLevel: 'global',
  telegramNotify: { enabled: false },
  debugMode: false
});

await client.ingestLog({
  uuid: project.uuid,
  log: {
    level: 'ERROR',
    message: 'Order processing failed',
    tags: ['ORDERS'],
    metadata: { service: 'orders-api' }
  }
});

const logs = await client.getProjectLogs(project.uuid, { level: 'ERROR' });
console.log(logs.logs.length);
```

## Testing

The library ships with Vitest-based unit tests that stub the `fetch` API, verifying request payloads,
headers, query string generation, and error propagation.
