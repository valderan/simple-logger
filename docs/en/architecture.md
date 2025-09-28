# Logger Architecture

## Overview

Logger combines a REST API and a web client to help small teams collect, store, and analyze microservice logs without heavy observability platforms. The API is built with Node.js/Express and MongoDB, while the React client communicates with it via secured endpoints.

## Repository layout

```text
simple-logger/
├── api/                   # Server-side source code and infrastructure
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/   # REST business logic
│   │   │   ├── middlewares/   # Auth, rate limiting, whitelist
│   │   │   ├── models/        # Mongoose schemas
│   │   │   ├── routes/        # Express routes
│   │   │   └── utils/         # Mongo helpers, filters, utilities
│   │   ├── ping/              # Ping scheduler
│   │   └── telegram/          # Telegram Bot API integration
│   ├── docker-compose.*.yml   # Dev/Prod compose definitions
│   └── swaggerapi/            # OpenAPI 3.0 specification
├── client/                # Vite + React admin interface
│   ├── src/               # Pages, components, context providers
│   └── docker-compose.yml # Build and serve static assets via Nginx
├── docs/                  # Documentation (RU/EN) and usage notes
└── docs/examples/         # Ready-to-run integration scripts (bash, Go, Python, TS)
```

## Data flow

1. **Log ingestion** – services call `POST /api/logs` with their project UUID. `logController` validates input, stores the document, and records incidents in `logger-system` if the payload is invalid.
2. **Project management** – administrators authenticate via `/api/auth/login` and manage projects, ping checks, and the whitelist under `/api/projects/*` and `/api/settings/*`.
3. **Log browsing and metrics** – the web client uses TanStack Query to talk to the API, caches responses, and renders tables/charts. Log filters are synced to the query string.
4. **Ping monitoring** – when a check is created a MongoDB record is stored and the worker in `src/ping` periodically probes the target URL. Every outage is recorded inside `logger-system` and, if Telegram is enabled, raises an alert for project subscribers.

## Security and operations

- **Rate limiting and whitelist** – middleware in `src/api/middlewares` throttle requests and verify client IPs.
- **Telegram notifications** – the `src/telegram` module sends messages to users configured per project.
- **Docker-first** – both components ship with Dockerfiles and compose files for development and production.
- **Swagger UI** – the OpenAPI spec is stored in `api/swaggerapi/openapi.yaml` and can be served via the `docker-compose.dev.yml` service.

## Personas

- **DevOps / administrator** – creates projects, configures the whitelist, manages ping checks and notifications.
- **Developer** – uses issued UUIDs to send logs over HTTP following the examples in `docs/examples`.
- **Support engineer** – works in the web UI, filters events, monitors ping services, and handles cleanup.

These scenarios rely on a modular architecture: business logic is decoupled from controllers, and the frontend reuses providers/hooks, which keeps the product extensible.
