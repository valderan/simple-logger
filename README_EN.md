<p align="center">
  <img src="./client/public/logo_light.png" alt="Simple Logger Logo" width="160" height=auto/>
</p>

# Lightweight centralized logging service

**Simple Logger** helps small and mid-sized teams add observability without deploying heavyweight monitoring stacks. The server accepts JSON logs over HTTP, stores them in MongoDB, sends Telegram alerts, and exposes a friendly web UI for analysis. Instead of maintaining a complex platform you can run a single service and get the insights you need.

## Simple Logger documentation

> ℹ️ **Quick documentation guide**
> 
> • 🇬🇧 Core guides: [docs/en/api.md](docs/en/api.md), [docs/en/api_security.md](docs/en/api_security.md), [docs/en/logger_api_reference.md](docs/en/logger_api_reference.md)
>
> • 🇷🇺 Russian resources: [docs/ru/api.md](docs/ru/api.md), [docs/ru/api_security.md](docs/ru/api_security.md), [docs/ru/logger_api_reference.md](docs/ru/logger_api_reference.md)
>
> • 🖥️ Desktop: [docs/en/desktop.md](docs/en/desktop.md) · [docs/ru/desktop.md](docs/ru/desktop.md)
>
> • ⚙️ Environment variables: [docs/en/env_variables.md](docs/en/env_variables.md) · [docs/ru/env_variables.md](docs/ru/env_variables.md)
> 
> • 📘 OpenAPI specs: [api/swaggerapi/openapi.yaml](api/swaggerapi/openapi.yaml) · [api/swaggerapi/openapi_en.yaml](api/swaggerapi/openapi_en.yaml)
> 
> • 📦 TypeScript SDK: [docs/ts-library-doc/Logger-en.md](docs/ts-library-doc/Logger-en.md), [docs/ts-library-doc/Logger-ru.md](docs/ts-library-doc/Logger-ru.md)

The platform ingests structured logs, tracks service uptime, and forwards alerts to Telegram. The repository ships with detailed guides that explain the architecture, API, security model, and client tooling:

- Overview and architecture: [docs/en/about.md](docs/en/about.md) · [docs/ru/about.md](docs/ru/about.md), [docs/en/architecture.md](docs/en/architecture.md) · [docs/ru/architecture.md](docs/ru/architecture.md)
- API security and settings: [docs/en/api_security.md](docs/en/api_security.md) · [docs/ru/api_security.md](docs/ru/api_security.md), [docs/api_security_improvements.md](docs/api_security_improvements.md)
- Client and SDK: [docs/en/client.md](docs/en/client.md) · [docs/ru/client.md](docs/ru/client.md), [docs/ts-library-doc/Logger-en.md](docs/ts-library-doc/Logger-en.md) · [docs/ts-library-doc/Logger-ru.md](docs/ts-library-doc/Logger-ru.md)

## Library documentation

The `ts-library` package bundles a lightweight TypeScript helper for shipping structured logs and automating project management through the REST API. It exposes two core modules:

- **Logger** – queues events locally and forwards them to the backend with optional throttling.
- **ApiClient** – typed wrapper around every Simple Logger REST endpoint.

Read the full guides in the repository:

- Russian docs: [docs/ts-library-doc/Logger-ru.md](docs/ts-library-doc/Logger-ru.md), [docs/ts-library-doc/ApiClient-ru.md](docs/ts-library-doc/ApiClient-ru.md)
- English docs: [docs/ts-library-doc/Logger-en.md](docs/ts-library-doc/Logger-en.md), [docs/ts-library-doc/ApiClient-en.md](docs/ts-library-doc/ApiClient-en.md)

## Features

- Ingest, store, and filter logs by project UUID.
- Ping monitoring for HTTP services with manual probe triggers and outage records stored in Logger Core.
- Telegram notifications based on tags and incidents, each prefixed with the project name and UUID.
- Per-project retention limits (`maxLogEntries`) with critical alerts when the quota is exhausted.
- IP allowlist disables the rate limiter for trusted addresses, while global rate limiting protects all other clients.
- Web client with dark/light themes, search, and detailed log views.
- Telegram system logs automatically add `chatId`, `userId`, `projectUuid`, and (for multi-project chats) `projectSubscriptions` so operators can trace issues to the exact conversation.

## Telegram bot status check

Administrators can call `GET /api/settings/telegram-status` to instantly verify that the `BOT_API_KEY` token is configured and the bot is polling. The same functionality is exposed in `ApiClient` through `getTelegramStatus()`.

- API overview: [docs/en/api.md](docs/en/api.md#security-settings-settings) · [docs/ru/api.md](docs/ru/api.md#настройки-безопасности-settings)
- Reference guide: [docs/en/logger_api_reference.md](docs/en/logger_api_reference.md#66-get-telegram-status) · [docs/ru/logger_api_reference.md](docs/ru/logger_api_reference.md#66-get-telegram-status)
- SDK docs: [docs/ts-library-doc/ApiClient-en.md](docs/ts-library-doc/ApiClient-en.md#api-settings) · [docs/ts-library-doc/ApiClient-ru.md](docs/ts-library-doc/ApiClient-ru.md#настройки-api)

To share the bot link use `GET /api/settings/telegram-url` or the `getTelegramBotUrl()` helper. The service returns the URL from `BOT_URL` or, when the bot is active, resolves the username via Telegram Bot API. Read more in [docs/en/logger_api_reference.md](docs/en/logger_api_reference.md#67-get-telegram-url) and [docs/ru/logger_api_reference.md](docs/ru/logger_api_reference.md#67-get-telegram-url).

## Logger Core safeguards

- The public `/api/logs` endpoint rejects any attempt to write into the `logger-system` project and logs the incident for auditing.
- Telegram chat commands (`ADD:<UUID>`) cannot subscribe to Logger Core; subscriptions are managed exclusively from the admin interface.
- When a project reaches its `maxLogEntries` cap the system writes a critical `LOG_CAP`/`ALERT` record into Logger Core and responds with `409 Conflict`.

## Project components

| Path | Description |
|------|-------------|
| `api/` | Node.js + Express REST API, MongoDB models, Telegram integration, dev/prod docker-compose files, and the OpenAPI spec. |
| `client/` | React + TypeScript UI powered by Vite, shipped as a static SPA and an Nginx image. |
| `docs/` | Documentation in Russian and English, database schema, and client guide. |
| `docs/examples/` | Ready-made integration scripts for Bash, Go, Python, and TypeScript. |
| `ts-library/` | TypeScript SDK for the API and logger, ready for npm publishing. |
| `desktop/` | Electron application that embeds the production web client for desktop platforms. |

## TypeScript SDK at a glance

The repository includes the `ts-library` package for two common scenarios:

- `Logger` — a client-side logger with queueing, templates, and rate limiting.
- `ApiClient` — a typed wrapper around every Simple Logger API endpoint.

Documentation and usage guides:

- [Logger (ru)](docs/ts-library-doc/Logger-ru.md) / [Logger (en)](docs/ts-library-doc/Logger-en.md)
- [ApiClient (ru)](docs/ts-library-doc/ApiClient-ru.md) / [ApiClient (en)](docs/ts-library-doc/ApiClient-en.md)

The new `getTelegramBotUrl()` method extends the `ApiClient`, returning the invite link together with its source (`env`, `telegram`, `inactive`, `unknown`) and a `botActive` flag. This enables the UI to surface an up-to-date invitation even when the environment variable is missing.

Build the package with `npm install`, `npm run build`, and `npm test` inside the `ts-library` folder.

## Running the API

### Locally

```bash
cd api
npm install
npm run build
npm start
```

Environment variables:

- `MONGO_URI` – MongoDB connection string (defaults to `mongodb://localhost:27017/logger`).
- `ADMIN_USER`, `ADMIN_PASS` – administrator credentials.
- `ADMIN_IP` – permanently allow this IP; it cannot be removed from the whitelist while the variable is set.
- `BOT_API_KEY` – Telegram bot token (optional).

For development:

```bash
npm run dev
```

Run the test suite:

```bash
npm test
```

### Docker

Developer stack with Swagger UI and MongoDB:

```bash
cd api
docker compose -f docker-compose.dev.yml up --build
```

Production-ready setup:

```bash
cd api
docker compose -f docker-compose.prod.yml up --build -d
```

By default the API listens on `http://localhost:3000`, Swagger UI on `http://localhost:3001`.

## Running the client

### Locally

```bash
cd client
npm install
npm run dev
```

Vite serves the app on `http://localhost:5173` by default. Configure the API URL via `VITE_API_URL` (for example `http://localhost:3000/api`). Optional variables: `VITE_LOGGER_VERSION`, `VITE_LOGGER_PAGE_URL`.

### Docker

```bash
cd client
docker compose up --build
```

The container builds the production bundle and serves it with Nginx on port `80`. Provide `VITE_API_URL`, `VITE_LOGGER_VERSION`, `VITE_LOGGER_PAGE_URL` during the build (legacy keys without the prefix can still be set for third-party scripts).

## Running the desktop client

### Preparation

1. Install dependencies:

   ```bash
   cd desktop
   npm install
   ```

2. Build the web client and copy it into `desktop/web-dist`:

   ```bash
   cd ../client
   npm install
   npm run build
   cd ../desktop
   npm run sync:web
   ```

3. Launch the Electron shell:

   ```bash
   npm start
   ```

### Development workflow

- Start the Vite dev server in `client` (`npm run dev`).
- Run `npm run dev` in `desktop`. Electron opens `http://localhost:5173` by default; override it with `DEV_SERVER_URL`.

### Packaging installers

Use [`electron-builder`](https://www.electron.build/):

```bash
npm run build       # current OS
npm run build:linux # AppImage and deb
npm run build:win   # NSIS installer and portable build
npm run build:mac   # DMG and ZIP
```

Ensure `desktop/web-dist` contains the up-to-date web bundle before packaging. See [desktop/README_EN.md](desktop/README_EN.md) and [docs/en/desktop.md](docs/en/desktop.md) for details.

## Documentation

- Russian: [docs/ru/about.md](docs/ru/about.md), [docs/ru/architecture.md](docs/ru/architecture.md), [docs/ru/database.md](docs/ru/database.md), [docs/ru/api.md](docs/ru/api.md), [docs/ru/logger_api_reference.md](docs/ru/logger_api_reference.md), [docs/ru/client.md](docs/ru/client.md), [docs/ru/api_security.md](docs/ru/api_security.md), [docs/api_security_improvements.md](docs/api_security_improvements.md).
- [Client screenshots](docs/screenshots/) - docs/screenshots
- Environment variables: [docs/en/env_variables.md](docs/en/env_variables.md) · [docs/ru/env_variables.md](docs/ru/env_variables.md)
- Desktop client: [docs/en/desktop.md](docs/en/desktop.md) · [docs/ru/desktop.md](docs/ru/desktop.md)
- English: [docs/en/about.md](docs/en/about.md), [docs/en/architecture.md](docs/en/architecture.md), [docs/en/database.md](docs/en/database.md), [docs/en/api.md](docs/en/api.md), [docs/en/logger_api_reference.md](docs/en/logger_api_reference.md), [docs/en/client.md](docs/en/client.md), [docs/en/api_security.md](docs/en/api_security.md).

## Integration examples

Each subdirectory contains ready-to-run scripts that demonstrate the full API flow.

### Bash

- [login.sh](docs/examples/bash/login.sh) – obtain an admin token.
- [create_project.sh](docs/examples/bash/create_project.sh) – create a project and print its UUID.
- [ingest_log.sh](docs/examples/bash/ingest_log.sh) – send a valid log.
- [filter_logs.sh](docs/examples/bash/filter_logs.sh) – query logs with filters.
- [add_ping_service.sh](docs/examples/bash/add_ping_service.sh) – register a ping service.

### Python

- [login.py](docs/examples/python/login.py) – authenticate and store the token.
- [create_project.py](docs/examples/python/create_project.py) – create a project via `requests`.
- [ingest_log.py](docs/examples/python/ingest_log.py) – send an event with extra metadata.
- [filter_logs.py](docs/examples/python/filter_logs.py) – filter logs and print the results.
- [add_ping_service.py](docs/examples/python/add_ping_service.py) – add an availability check.

### Go

- [login.go](docs/examples/go/login.go) – fetch a JWT using the standard library.
- [create_project.go](docs/examples/go/create_project.go) – serialize the project payload.
- [ingest_log.go](docs/examples/go/ingest_log.go) – send logs with custom tags.
- [filter_logs.go](docs/examples/go/filter_logs.go) – request logs with filter parameters.
- [trigger_ping_check.go](docs/examples/go/trigger_ping_check.go) – manually trigger a ping check.

### TypeScript

- [login.ts](docs/examples/typescript/login.ts) – authenticate via `node-fetch`.
- [loggerClient.ts](docs/examples/typescript/loggerClient.ts) – API wrapper with token reuse.
- [ingestLog.ts](docs/examples/typescript/ingestLog.ts) – typed log ingestion example.
- [listProjects.ts](docs/examples/typescript/listProjects.ts) – fetch all projects.
- [deleteLogs.ts](docs/examples/typescript/deleteLogs.ts) – bulk-delete logs using filters.

## Extras

- Health check endpoint: `GET http://localhost:3000/health`.
- The web app supports light/dark themes, localization, and persists log filters in the URL.
- Track changes in [CHANGELOG.md](CHANGELOG.md).
