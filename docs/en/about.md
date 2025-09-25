# Logger overview and requirements

## Project goals

**Logger** is a secure centralized logging service for microservices. It targets small and medium teams that need a single collection point without deploying heavy observability platforms. The system ingests events, stores them in MongoDB, allows filtering, monitors service availability, and sends Telegram notifications.

## Business requirements

- Fast onboarding via REST API and web interface.
- Telegram alerts for incidents and service outages.
- Ping monitoring with configurable intervals.
- API protection against spam and unauthorized access (rate limiting, IP whitelist).
- Ability to tune API request limits without redeploying the service.
- Ability to export, filter, and purge logs using multiple criteria.

## Functional requirements

### Web interface

The client located in `client/` offers the following sections:

1. **Authentication** – login/password; after several failed attempts the IP is blocked for one hour.
2. **Dashboard** – project, event, and ping-service summary.
3. **Projects** – create, edit, delete projects and retrieve UUIDs.
4. **Logs** – view, filter, delete logs and copy entries to the clipboard.
5. **Ping services** – list uptime checks, edit parameters, delete entries, and trigger manual probes.
6. **Telegram** – configure recipients and anti-spam settings.
7. **Settings** – manage the IP whitelist, current rate limit, and other security options.

### MongoDB

Main collections:

- `projects` – project metadata, log format, tags, access settings, Telegram notifications, `debugMode` flag.
- `logs` – log entries with level, message, tags, metadata (IP, service, user, extra fields).
- `pingservices` – URL, interval, latest status, last check timestamp, alert tags.
- `whitelists` – allowed IPs and comments.

### API

- Authentication (`POST /api/auth/login`).
- Project and ping-service CRUD (`/api/projects/*`).
- Log ingestion and filtering (`/api/logs`).
- IP whitelist and rate limit management (`/api/settings/*`).

### Security and auditing

- The `logger-system` project is created automatically and stores internal events.
- Invalid UUIDs are registered as security incidents.
- All login attempts are recorded with IP and timestamp.
- Rate limiting and IP whitelist are enabled by default.

### Telegram integration

- Bot connection through `BOT_API_KEY`.
- Managing recipients and tags for notifications.
- Anti-spam settings with minimum interval between alerts.

## Personas

- **DevOps / administrator** – creates projects, configures the whitelist, manages ping services and notifications.
- **Developer** – sends logs over HTTP using the provided UUID and the examples from `docs/examples`.
- **On-call engineer** – uses the web interface to analyze events, trigger checks, and clean up logs.

## Documentation and examples

- `docs/en/architecture.md` – repository layout and data flow.
- `docs/en/database.md` – MongoDB collection description.
- `docs/en/api.md` and `docs/en/logger_api_reference.md` – routes and request samples.
- `docs/en/client.md` – web client guide.
- `docs/examples/` – integration scripts for Bash, Go, Python, and TypeScript.

These documents support development, onboarding, and operations, and mirror the Russian originals stored in `docs/ru`.
