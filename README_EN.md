# Simple Logger — lightweight centralized logging service

**Simple Logger** helps small and mid-sized teams add observability without deploying heavyweight monitoring stacks. The server accepts JSON logs over HTTP, stores them in MongoDB, sends Telegram alerts, and exposes a friendly web UI for analysis. Instead of maintaining a complex platform you can run a single service and get the insights you need.

## Features

- Ingest, store, and filter logs by project UUID.
- Ping monitoring for HTTP services with manual probe triggers.
- Telegram notifications based on tags and incidents.
- IP whitelist and rate limiting to protect the API.
- Web client with dark/light themes, search, and detailed log views.

## Project components

| Path | Description |
|------|-------------|
| `api/` | Node.js + Express REST API, MongoDB models, Telegram integration, dev/prod docker-compose files, and the OpenAPI spec. |
| `client/` | React + TypeScript UI powered by Vite, shipped as a static SPA and an Nginx image. |
| `docs/` | Documentation in Russian and English, database schema, and client guide. |
| `docs/examples/` | Ready-made integration scripts for Bash, Go, Python, and TypeScript. |

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

Vite serves the app on `http://localhost:5173` by default. Configure the API URL via `VITE_API_URL` (for example `http://localhost:3000/api`). Optional variables: `LOGGER_VERSION`, `LOGGER_PAGE_URL`.

### Docker

```bash
cd client
docker compose up --build
```

The container builds the production bundle and serves it with Nginx on port `80`. Values for `API_URL`, `LOGGER_VERSION`, `LOGGER_PAGE_URL` are passed during build time.

## Documentation

- Russian: [docs/ru/about.md](docs/ru/about.md), [docs/ru/architecture.md](docs/ru/architecture.md), [docs/ru/database.md](docs/ru/database.md), [docs/ru/api.md](docs/ru/api.md), [docs/ru/logger_api_reference.md](docs/ru/logger_api_reference.md), [docs/ru/client.md](docs/ru/client.md).
- English: [docs/en/about.md](docs/en/about.md), [docs/en/architecture.md](docs/en/architecture.md), [docs/en/database.md](docs/en/database.md), [docs/en/api.md](docs/en/api.md), [docs/en/logger_api_reference.md](docs/en/logger_api_reference.md), [docs/en/client.md](docs/en/client.md).

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
