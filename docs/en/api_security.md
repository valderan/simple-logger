# Simple Logger API Security

This document describes the security mechanisms implemented in the `./api` service and provides practical guidance for working with lockouts, IP allowlists, and notifications.

## Admin login and IP lockouts

The admin login flow is implemented in [`authController.ts`](../../api/src/api/controllers/authController.ts). Every login attempt records the client's IP address. When an IP is already locked, the API immediately returns `423 Locked` and skips credential verification.【F:api/src/api/controllers/authController.ts†L8-L22】

Failed attempts are tracked by the [`LoginAttempts`](../../api/src/api/utils/loginAttempts.ts) helper. It keeps counters in process memory (`Map`). After five consecutive failures (`maxAttempts = 5`) the IP is blocked for one hour (`LOCK_INTERVAL_MS = 60 * 60 * 1000`). The lock is removed automatically after the timeout or right after a successful login, which calls `reset` and clears the counter.【F:api/src/api/utils/loginAttempts.ts†L11-L38】【F:api/src/api/controllers/authController.ts†L15-L18】

Important: lock data is not persisted anywhere. Restarting the Node.js process or Docker container clears the in-memory map and removes every ban.

### Clearing the lock when you control the container

If a developer mistypes the password five times and gets locked out, there are three options:

1. **Wait one hour** — the timeout expires and the lock is lifted automatically.
2. **Log in successfully** — the correct password immediately resets the counter for that IP.【F:api/src/api/controllers/authController.ts†L15-L18】
3. **Restart the API** — with Docker access run `docker compose restart api` (or stop/start the container manually). Because `LoginAttempts` stores state in memory only, restarting removes the entry.【F:api/src/api/utils/loginAttempts.ts†L11-L38】

The API currently does not expose a dedicated endpoint for manually clearing the lockout counter.

## IP allowlist and related blocks

Every request passes through the global [`ipWhitelist`](../../api/src/api/middlewares/ipWhitelist.ts) middleware, executed after the blacklist check and the rate limiter. Its workflow:

1. Once per minute it refreshes the local cache from the MongoDB `Whitelist` collection (model [`WhitelistModel`](../../api/src/api/models/Whitelist.ts)).【F:api/src/api/middlewares/ipWhitelist.ts†L4-L20】【F:api/src/api/models/Whitelist.ts†L3-L17】
2. If the allowlist is empty, all clients are allowed (default behaviour for a fresh installation).【F:api/src/api/middlewares/ipWhitelist.ts†L28-L29】
3. Local requests (`127.0.0.1` and `::1`) are always accepted so the service can call itself or work inside the same container.【F:api/src/api/middlewares/ipWhitelist.ts†L31-L33】
4. Other IPs are checked against the cache; if the address is missing, the response is `403 Forbidden` with the message “IP not in allowlist.”【F:api/src/api/middlewares/ipWhitelist.ts†L34-L37】

### Data storage

The allowlist lives in the MongoDB `whitelists` collection. Its schema enforces a unique IP, optional description, and a creation timestamp.【F:api/src/api/models/Whitelist.ts†L3-L17】 Admins can manage entries via `/api/settings/whitelist` endpoints.

### Lifting the block for a new project

When an external project floods the API with malformed UUIDs and its IP is not allowlisted, every request will get `403 Forbidden` until the address is added to `Whitelist`. To restore access quickly:

1. Call `POST /api/settings/whitelist` as an authenticated admin and add the IP via UI or script.
2. Or insert the document directly in MongoDB (`db.whitelists.insertOne({ ip: 'X.X.X.X', description: 'Project ABC' })`).

The new entry appears in the cache within a minute (cache TTL) or immediately after restarting the API.【F:api/src/api/middlewares/ipWhitelist.ts†L12-L20】 Any request handled through `/api/settings/whitelist` also clears the middleware cache so updates take effect instantly.【F:api/src/api/controllers/settingsController.ts†L25-L40】【F:api/src/api/middlewares/ipWhitelist.ts†L39-L43】

## IP blacklist

Hard bans are enforced by the [`blacklistGuard`](../../api/src/api/middlewares/blacklistGuard.ts) middleware. It runs before the rate limiter and allowlist and checks whether the client IP is stored in the MongoDB `blacklists` collection. When a block is active (no expiration or `expiresAt` in the future) the request is rejected with `403 Forbidden`, and a `SECURITY` log entry is written to the `logger-system` project with the reason and requested path.【F:api/src/api/middlewares/blacklistGuard.ts†L8-L37】

The persistence logic lives in [`blacklist.ts`](../../api/src/api/services/blacklist.ts):

- every create/update/delete operation calls `writeSystemLog`, providing a full audit trail;【F:api/src/api/services/blacklist.ts†L35-L104】
- active bans are cached in memory for a minute to avoid hitting the database on every request;【F:api/src/api/services/blacklist.ts†L8-L33】
- permanent bans keep `expiresAt` as `null`, while temporary ones store the exact expiration timestamp.

Admins manage the blacklist through `/api/settings/blacklist` (list and create) and `/api/settings/blacklist/{id}` (update, delete). Attempting to reuse an IP returns `409 Conflict`, which simplifies error handling on the client side.【F:api/src/api/controllers/settingsController.ts†L42-L107】

### Interaction with other locks

Adding an IP to the allowlist **does not** influence login lockouts: they are stored separately inside `LoginAttempts`. When an address is locked because of five failed logins, the user must wait for the timeout or restart the service. Conversely, if an address was blocked only by the allowlist, adding it to `Whitelist` automatically restores access after the cache refresh.

### Access logging

All blacklist actions and blocked requests are recorded in the system journal. The `blacklistGuard` middleware logs the reason, HTTP method, and requested path whenever an IP is denied.【F:api/src/api/middlewares/blacklistGuard.ts†L17-L35】 Administrative operations (create, update, delete) also write entries with `BLACKLIST` and `SETTINGS` tags. The allowlist still does not log rejections, but its cache invalidates automatically after API changes.【F:api/src/api/services/blacklist.ts†L35-L104】【F:api/src/api/middlewares/ipWhitelist.ts†L39-L43】

## Global protection rules

Base protections are configured in `app.ts`:

- Security headers via `helmet`, CORS control through `cors`, and a JSON body size limit of 1 MB to block oversized payloads.【F:api/src/app.ts†L17-L23】
- A global rate limiter (`express-rate-limit`) defaults to 120 requests per minute per IP and can be adjusted through `PUT /api/settings/rate-limit`. Projects with the `whitelist` or `docker` access level bypass the limiter to keep trusted services responsive.【F:api/src/api/middlewares/rateLimiter.ts†L6-L34】
- Admin sessions are kept in memory with a 60-minute TTL. Tokens appear only after a successful `ADMIN_USER`/`ADMIN_PASS` check and are purged automatically when expired.【F:api/src/api/utils/sessionStore.ts†L13-L50】
- Payloads submitted to `/api/logs` are validated with `zod`, which prevents arbitrary structures from entering the database and simplifies troubleshooting.【F:api/src/api/controllers/logController.ts†L9-L76】
- Telegram notifications apply anti-spam intervals and tag filtering to avoid message storms.【F:api/src/telegram/notifier.ts†L104-L127】

## Throughput and large log volumes

With the default settings the limiter allows 120 requests per minute per IP. Therefore the API **cannot** ingest 40 000 logs per minute (~667 per second) or 40 000 per second from a single source: the limiter will respond with `429 Too Many Requests`. You can raise the threshold via `/api/settings/rate-limit`, but high-volume scenarios still demand architectural changes (see the improvement list) such as IP sharding or queue-based ingestion.

Beyond the limiter, MongoDB write throughput matters: every log is inserted synchronously via `LogModel.create`. Tens of thousands of writes per second would demand database tuning (batch operations, replication, dedicated hardware).

## Telegram notifications

Telegram settings are stored per project inside the `Project` document. Each recipient can define tags and an anti-spam interval (in minutes). When logs are ingested, the controller invokes `defaultNotifier.notify`:

1. If the bot token is missing or notifications are disabled for the project, nothing is sent.【F:api/src/telegram/notifier.ts†L104-L111】
2. For each recipient the notifier computes a `projectUuid:chatId:tag` key. Messages are sent only if at least `antiSpamInterval` minutes passed since the last notification for that key.【F:api/src/telegram/notifier.ts†L109-L125】

Example: if a website check runs every minute and the site stays down, the `PING_DOWN` notification is sent only once per configured interval. With a 15-minute anti-spam window, repeated alerts are suppressed until the timeout expires, protecting the team from notification storms.

When `BOT_API_KEY` is present the bot starts polling, registers menu commands, and handles interactive events. Responses follow the language selected via `/language` (Russian or English).【F:api/src/telegram/notifier.ts†L76-L220】【F:api/src/telegram/notifier.ts†L290-L370】

- Sending `ADD:<UUID>` subscribes the chat to a project after validating the UUID and confirming that the project exists. Users receive confirmations, duplicates are prevented, and the error counter resets.【F:api/src/telegram/notifier.ts†L222-L255】
- Sending `DELETE:<UUID>` removes the subscription or reports that the chat is not linked to the project.【F:api/src/telegram/notifier.ts†L257-L288】
- `/subscriptions` lists active projects and exposes inline buttons that trigger instant unsubscribe callbacks.【F:api/src/telegram/notifier.ts†L201-L220】【F:api/src/telegram/notifier.ts†L290-L358】
- `/info` returns the current `USERID` and `CHATID` so operators can forward them to administrators for manual onboarding.【F:api/src/telegram/notifier.ts†L201-L211】
- Invalid UUID attempts increment a counter; after ten failures the bot blocks the user for an hour, notifies them about the lock, and ignores further messages during the cooldown.【F:api/src/telegram/notifier.ts†L167-L180】【F:api/src/telegram/notifier.ts†L385-L399】

Every bot action and notification is written via `writeSystemLog`, simplifying audits in the `logger-system` project. If a log cannot be stored, the service writes an error to stderr.【F:api/src/telegram/notifier.ts†L119-L125】【F:api/src/telegram/notifier.ts†L517-L528】

## FAQ

- **How do I view active locks?** Temporary and permanent IP bans are visible via `GET /api/settings/blacklist`; login lockouts still live in memory and expire automatically.
- **Are system logs written when an IP is banned?** Yes. `blacklistGuard` records every denied request, and administrative changes to the blacklist are logged inside `logger-system` as well.
- **What happens if I add a banned IP to the allowlist?** Access is restored after the cache refresh (up to one minute) or immediately after restarting the API. It does not clear login lockouts — you must wait or restart the service.【F:api/src/api/middlewares/ipWhitelist.ts†L12-L37】【F:api/src/api/utils/loginAttempts.ts†L11-L38】
- **How do I clear a block caused by invalid UUID spam?** Add the sender IP to `Whitelist` and fix the UUID on the client. Wrong UUIDs are also logged in `logger-system`, aiding diagnosis.【F:api/src/api/controllers/logController.ts†L52-L59】

## Security layers in the project

The API relies on several protective layers:

1. **Network perimeter**: IP allowlist and rate limiter restrict access and mitigate overload.
2. **Authentication**: single admin login, in-memory sessions with TTL, and IP lockouts after repeated failures.
3. **Data validation**: `zod` schemas for logs and settings prevent malformed data.
4. **Incident logging**: the internal `logger-system` project stores warnings and security events.【F:api/src/api/utils/systemLogger.ts†L9-L19】
5. **Notifications**: Telegram integration with anti-spam and tag filters.
6. **Infrastructure hygiene**: `helmet`, body size limits, centralized request logging via `morgan`, and Docker-based isolation.【F:api/src/app.ts†L17-L23】

These mechanisms cover the basics but do not replace external security controls such as firewalls, WAFs, or database monitoring.

