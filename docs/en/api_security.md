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

## IP allowlist and rate-limit exemptions

Every request passes through the global [`ipWhitelist`](../../api/src/api/middlewares/ipWhitelist.ts) middleware after the blacklist guard and before routing. The middleware does not block traffic anymore. Instead, it classifies the current client IP so downstream components can decide whether throttling should apply.【F:api/src/api/middlewares/ipWhitelist.ts†L1-L45】

1. Once per minute the middleware refreshes an in-memory cache of normalized IPs from the MongoDB `Whitelist` collection and automatically adds the administrator IP defined via `ADMIN_IP` (if present).【F:api/src/api/middlewares/ipWhitelist.ts†L16-L27】【F:api/src/api/services/whitelist.ts†L5-L24】
2. The normalized request IP is compared against the cache. Loopback addresses (`127.0.0.1`, `::1`) are always trusted. The boolean result is stored on `req.isWhitelistedIp`, and the request continues down the stack.【F:api/src/api/middlewares/ipWhitelist.ts†L31-L39】
3. The rate limiter reads this flag and skips throttling for trusted IPs while still exempting projects configured with the `whitelist` or `docker` access level.【F:api/src/api/middlewares/rateLimiter.ts†L1-L35】

All other addresses follow the regular security rules: blacklist checks, global rate limiting and validation continue to apply. Removing an address from the allowlist simply returns it to the shared limits.

### Data storage and API

Whitelist entries reside in the MongoDB `whitelists` collection with a unique IP, optional description and `createdAt` timestamp.【F:api/src/api/models/Whitelist.ts†L3-L17】 The `/api/settings/whitelist` endpoints return enriched objects that expose an `isProtected` flag for administrator-managed records and reuse the same payload for create/update operations.【F:api/src/api/services/whitelist.ts†L31-L96】【F:api/src/api/controllers/settingsController.ts†L40-L74】 Cache invalidation happens automatically whenever an entry is added or removed, so UI changes become visible immediately.【F:api/src/api/middlewares/ipWhitelist.ts†L42-L45】【F:api/src/api/controllers/settingsController.ts†L47-L65】

### Administrator IP override

Set the `ADMIN_IP` environment variable in the API service to permanently allow an address. During bootstrap the value is normalized and inserted into the whitelist if missing, and the REST API rejects deletion attempts while the variable is set.【F:api/src/app.ts†L31-L35】【F:api/src/api/services/whitelist.ts†L5-L86】【F:api/src/api/controllers/settingsController.ts†L55-L65】 This guarantees that operational access for administrators remains available even if other settings are misconfigured.

### Working with integrations

Use the allowlist to exempt trusted data sources from the global rate limiter. External systems still need valid authentication tokens, and blacklist rules always take precedence. If a partner system hits validation errors (for example, malformed UUIDs), add its IP to the allowlist to keep throughput high while fixing the client. Once the integration stabilises you can remove the address again—the client will fall back to the shared limits without being blocked.

## IP blacklist

Hard bans are enforced by the [`blacklistGuard`](../../api/src/api/middlewares/blacklistGuard.ts) middleware. It runs before the rate limiter and allowlist and checks whether the client IP is stored in the MongoDB `blacklists` collection. When a block is active (no expiration or `expiresAt` in the future) the request is rejected with `403 Forbidden`, and a `SECURITY` log entry is written to the `logger-system` project with the reason and requested path.【F:api/src/api/middlewares/blacklistGuard.ts†L8-L37】

The persistence logic lives in [`blacklist.ts`](../../api/src/api/services/blacklist.ts):

- every create/update/delete operation calls `writeSystemLog`, providing a full audit trail;【F:api/src/api/services/blacklist.ts†L83-L160】
- active bans are cached in memory for a minute to avoid hitting the database on every request;【F:api/src/api/services/blacklist.ts†L6-L63】
- temporary blocks are removed automatically once they expire; each cleanup run logs a dedicated `blacklist-cleanup` entry for visibility;【F:api/src/api/services/blacklist.ts†L24-L60】
- permanent bans keep `expiresAt` as `null`, while temporary ones store the exact expiration timestamp.

Admins manage the blacklist through `/api/settings/blacklist` (list and create) and `/api/settings/blacklist/{id}` (update, delete). Attempting to reuse an IP returns `409 Conflict`, which simplifies error handling on the client side.【F:api/src/api/controllers/settingsController.ts†L42-L107】

### Interaction with other locks

Adding an IP to the allowlist **does not** influence login lockouts: they are stored separately inside `LoginAttempts`. When an address is locked because of five failed logins, the user must wait for the timeout or restart the service. Because the allowlist no longer rejects requests, removing an entry simply puts the client back under the shared rate limit—persistent `403` responses always come from the blacklist.【F:api/src/api/utils/loginAttempts.ts†L11-L38】【F:api/src/api/middlewares/ipWhitelist.ts†L31-L39】【F:api/src/api/middlewares/blacklistGuard.ts†L8-L37】

### Access logging

All blacklist actions and blocked requests are recorded in the system journal. The `blacklistGuard` middleware logs the reason, HTTP method, and requested path whenever an IP is denied.【F:api/src/api/middlewares/blacklistGuard.ts†L19-L32】 Administrative operations (create, update, delete) also write entries with `BLACKLIST` and `SETTINGS` tags, and automatic expiry cleanup is reported as well.【F:api/src/api/services/blacklist.ts†L24-L160】 All system messages are persisted in English to keep the audit trail consistent. The allowlist merely marks trusted requests for the rate limiter and therefore does not generate its own log entries.【F:api/src/api/middlewares/ipWhitelist.ts†L31-L39】【F:api/src/api/middlewares/rateLimiter.ts†L1-L35】

## Global protection rules

Base protections are configured in `app.ts`:

- Security headers via `helmet`, CORS control through `cors`, and a JSON body size limit of 1 MB to block oversized payloads.【F:api/src/app.ts†L17-L23】
- A global rate limiter (`express-rate-limit`) defaults to 120 requests per minute per IP and can be adjusted through `PUT /api/settings/rate-limit`. Requests flagged by the allowlist and projects with the `whitelist` or `docker` access level bypass the limiter to keep trusted services responsive.【F:api/src/api/middlewares/ipWhitelist.ts†L31-L39】【F:api/src/api/middlewares/rateLimiter.ts†L1-L35】
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

- Sending `ADD_<UUID>` subscribes the chat to a project after validating the UUID and confirming that the project exists. Users receive confirmations, duplicates are prevented, and the error counter resets.【F:api/src/telegram/notifier.ts†L226-L259】
- Sending `DELETE_<UUID>` removes the subscription or reports that the chat is not linked to the project.【F:api/src/telegram/notifier.ts†L261-L292】
- `/subscriptions` lists active projects and exposes inline buttons that trigger instant unsubscribe callbacks.【F:api/src/telegram/notifier.ts†L201-L220】【F:api/src/telegram/notifier.ts†L290-L358】
- `/info` returns the current `USERID` and `CHATID` so operators can forward them to administrators for manual onboarding.【F:api/src/telegram/notifier.ts†L201-L211】
- Invalid UUID attempts increment a counter; after ten failures the bot blocks the user for an hour, notifies them about the lock, and ignores further messages during the cooldown.【F:api/src/telegram/notifier.ts†L167-L180】【F:api/src/telegram/notifier.ts†L385-L399】

Every bot action and notification is written via `writeSystemLog`, simplifying audits in the `logger-system` project. If a log cannot be stored, the service writes an error to stderr.【F:api/src/telegram/notifier.ts†L119-L125】【F:api/src/telegram/notifier.ts†L517-L528】

## FAQ

- **How do I view active locks?** Temporary and permanent IP bans are visible via `GET /api/settings/blacklist`; login lockouts still live in memory and expire automatically.
- **Are system logs written when an IP is banned?** Yes. `blacklistGuard` records every denied request, and administrative changes to the blacklist are logged inside `logger-system` as well.
- **What happens if I add a banned IP to the allowlist?** The allowlist only disables the rate limiter. Blacklist bans and login lockouts still apply until the block expires or is removed.【F:api/src/api/middlewares/ipWhitelist.ts†L31-L39】【F:api/src/api/middlewares/blacklistGuard.ts†L8-L37】【F:api/src/api/utils/loginAttempts.ts†L11-L38】
- **How do I clear throttling caused by invalid UUID spam?** Fix the UUID on the client and optionally add the sender IP to the allowlist so requests are not rate-limited while debugging. Validation errors are written to `logger-system` for investigation.【F:api/src/api/controllers/logController.ts†L64-L85】【F:api/src/api/middlewares/ipWhitelist.ts†L31-L39】

## Security layers in the project

The API relies on several protective layers:

1. **Network perimeter**: IP allowlist and rate limiter restrict access and mitigate overload.
2. **Authentication**: single admin login, in-memory sessions with TTL, and IP lockouts after repeated failures.
3. **Data validation**: `zod` schemas for logs and settings prevent malformed data.
4. **Incident logging**: the internal `logger-system` project stores warnings and security events.【F:api/src/api/utils/systemLogger.ts†L9-L19】
5. **Notifications**: Telegram integration with anti-spam and tag filters.
6. **Infrastructure hygiene**: `helmet`, body size limits, centralized request logging via `morgan`, and Docker-based isolation.【F:api/src/app.ts†L17-L23】

These mechanisms cover the basics but do not replace external security controls such as firewalls, WAFs, or database monitoring.

