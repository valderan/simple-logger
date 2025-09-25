# Logger

The `Logger` class exposes a high-level API for client-side logging that can simultaneously send
messages to the Simple Logger API, print them to the console, and persist them on disk. The class is
implemented as a singleton so that the entire application shares a single instance.

## Installation

```bash
npm install @simple-logger/ts-library
```

## Quick start

```ts
import { Logger } from '@simple-logger/ts-library';

const logger = Logger.getInstance({
  apiBaseUrl: 'http://localhost:3000',
  defaultProjectUuid: '00000000-0000-0000-0000-000000000001',
  transports: {
    api: true,
    console: true,
    file: true
  },
  fileTransport: {
    enabled: true,
    filePath: './logs/app.json',
    format: 'json'
  }
});

logger.info('Application started');
```

## Key features

- Log levels `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`.
- Independent toggles for every transport.
- Rate limited API queue (120 messages/minute by default) with on-demand status checks.
- File queue with batching, disk access throttling, and automatic file rotation under 2 MB.
- Custom JSON templates with runtime switching.
- Automatic metadata enrichment for the default template (`timestamp`, `metadata.ip`).
- Health check (`GET /health`) before the first API batch is sent.

## LoggerOptions

| Property | Type | Description |
| --- | --- | --- |
| `apiBaseUrl` | `string` | Base URL of the Simple Logger API. |
| `defaultProjectUuid` | `string` | Default project UUID for API transport. |
| `rateLimitPerMinute` | `number` | Messages per minute for the API queue. |
| `transports` | `{ api?: boolean; console?: boolean; file?: boolean; }` | Transport toggles. |
| `templates` | `Record<string, LogTemplate>` | Custom JSON templates. |
| `activeTemplate` | `string` | Default template name. |
| `consoleTemplate` | `(level, record) => string` | Console formatter. |
| `fileTransport` | `FileTransportOptions` | File transport configuration. |
| `environment` | `string` | When set to `production`, the `DEBUG` level is disabled. |
| `defaultMetadata` | `LogMetadata` | Metadata injected by the default template. |

### FileTransportOptions

| Property | Type | Description |
| --- | --- | --- |
| `enabled` | `boolean` | Enables the file transport. |
| `format` | `'json' \| 'csv' \| 'txt'` | Output format. |
| `filePath` | `string` | Destination path. |
| `flushIntervalMs` | `number` | Flush interval in milliseconds. |
| `recordsPerInterval` | `number` | Records flushed per interval. |
| `maxFileSizeBytes` | `number` | Maximum file size (default 2 MB). |

## Logging methods

Convenience wrappers are available for each level:

- `debug(message, options?)`
- `info(message, options?)`
- `warning(message, options?)`
- `error(message, options?)`
- `critical(message, options?)`

`options` extends `LogRecordInput` and accepts:

- `tags?: string[]`
- `metadata?: LogMetadata`
- `templateName?: string` — switch template per call.
- `projectUuid?: string` — override the default project.
- `consoleTemplate?: (level, record) => string` — per-call console formatter.
- Any additional fields consumed by custom templates.

Example with a custom template:

```ts
logger.registerTemplate('minimal', (level, record) => ({
  level,
  message: record.message,
  tags: record.tags,
  custom: record.customField
}));

logger.critical('Unhandled exception', {
  templateName: 'minimal',
  projectUuid: '...uuid...',
  tags: ['BACKEND'],
  customField: { stack: '...' }
});
```

## Transport and queue management

- `setTransportEnabled('api' | 'console' | 'file', enabled)` — toggle a transport.
- `setLevelEnabled(level, enabled)` — enable or disable a level.
- `setRateLimit(value)` — change the API rate limit.
- `getApiQueueStatus()` — inspect `{ pending, estimatedMs, rateLimitPerMinute }`.
- `clearApiQueue()` and `waitForApiQueue()` — manage the API queue.
- `getFileQueueStatus()` and `flushFileQueue()` — control the file queue.
- `registerTemplate(name, template)` and `setActiveTemplate(name)` — manage templates.

## Implementation notes

- The first batch sent to the API performs a single `GET /health` check. If the API is
  unavailable the queue is cleared and a warning is printed to the console.
- File writes are batched and delayed to reduce disk churn. When the size limit is exceeded a new
  file with a timestamp suffix is created automatically.
- CSV persistence stores JSON payloads inside a single `payload` column, ensuring compatibility
  with arbitrary templates.

## Shutdown checklist

Call the following helpers before process termination to avoid losing data:

```ts
await logger.waitForApiQueue();
await logger.flushFileQueue();
```
