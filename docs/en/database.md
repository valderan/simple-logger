# Database structure

MongoDB is used as the primary datastore. Key collections and fields are listed below.

## Collection `projects`

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | string | Unique project identifier used by the API. |
| `name` | string | Service name. |
| `description` | string | Optional description. |
| `logFormat` | object | JSON schema of the expected log payload. |
| `defaultTags` | string[] | Built-in tags. |
| `customTags` | string[] | Project-specific tags. |
| `accessLevel` | enum | Access mode: `global`, `whitelist`, `docker`. |
| `telegramNotify` | object | Telegram notification settings. |
| `debugMode` | boolean | Skip Telegram notifications when `true`. |
| `maxLogEntries` | number | Maximum stored log entries (`0` = unlimited). |
| `createdAt/updatedAt` | date | Timestamps managed by Mongoose. |

## Collection `logs`

| Field | Type | Description |
|-------|------|-------------|
| `projectUuid` | string | Project UUID reference. |
| `level` | string | Log severity. |
| `message` | string | Log message. |
| `tags` | string[] | Tags associated with the event. |
| `timestamp` | date | Event time (indexed). |
| `metadata` | object | IP, service, user, Telegram chat/user IDs, project UUIDs, and extra context. |

## Collection `pingservices`

| Field | Type | Description |
|-------|------|-------------|
| `projectUuid` | string | Project reference. |
| `name` | string | Ping service name. |
| `url` | string | Target URL. |
| `interval` | number | Check interval in seconds. |
| `lastStatus` | enum | `ok`, `degraded`, or `down`. |
| `lastCheckedAt` | date | Timestamp of the last probe. |
| `telegramTags` | string[] | Tags for Telegram alerts. |

## Collection `whitelists`

| Field | Type | Description |
|-------|------|-------------|
| `ip` | string | Allowed IP address. |
| `description` | string | Optional comment. |
| `createdAt` | date | Added on timestamp. |

The public API augments responses with an `isProtected` flag that marks entries injected via the `ADMIN_IP` environment variable.【F:api/src/api/services/whitelist.ts†L31-L96】

## Security notes

- A `logger-system` project is created automatically to store internal events.
- Invalid UUIDs are logged as security incidents.
- The whitelist marks trusted IPs for the rate limiter via the `ipWhitelist` middleware.
