# ApiClient

`ApiClient` — это обёртка над REST API сервиса Simple Logger. Класс реализует все маршруты,
описанные в `api/swaggerapi/openapi.yaml`, и упрощает аутентификацию, построение URL и обработку
ответов.

## Установка

```bash
npm install @simple-logger/ts-library
```

## Инициализация

```ts
import { ApiClient } from '@simple-logger/ts-library';

const client = new ApiClient({
  baseUrl: 'http://localhost:3000'
});

await client.login({ username: 'admin', password: 'secret' });
```

### Параметры конструктора

| Свойство | Тип | Описание |
| --- | --- | --- |
| `baseUrl` | `string` | Базовый URL API (по умолчанию `http://localhost:3000`). |
| `token` | `string` | Токен администратора (можно установить позже). |

После вызова `login` токен автоматически сохраняется в экземпляре и будет добавляться в заголовок
`Authorization` для маршрутов, требующих авторизации.

## Управление токеном

- `setToken(token)` — вручную задать токен.
- `clearToken()` — удалить сохранённый токен.
- `setBaseUrl(url)` — переключить базовый URL.

## Методы

### Проверка состояния

- `health()` — `GET /health`, возвращает `{ status: 'ok' }`.

### Аутентификация

- `login(credentials)` — `POST /api/auth/login`, выдаёт `{ token }` и сохраняет его.

### Проекты

- `createProject(payload)` — `POST /api/projects`, создаёт проект.
- `listProjects()` — `GET /api/projects`, возвращает массив проектов.
- `getProject(uuid)` — `GET /api/projects/{uuid}`.
- `updateProject(uuid, payload)` — `PUT /api/projects/{uuid}`.
- `deleteProject(uuid)` — `DELETE /api/projects/{uuid}`. Возвращает
  `{ message, deletedLogs, deletedPingServices }`.
- `getProjectLogs(uuid, filters?)` — `GET /api/projects/{uuid}/logs`, возвращает `ProjectLogResponse`.

### Ping-сервисы

- `listPingServices(uuid)` — `GET /api/projects/{uuid}/ping-services`.
- `createPingService(uuid, payload)` — `POST /api/projects/{uuid}/ping-services`.
- `checkPingServices(uuid)` — `POST /api/projects/{uuid}/ping-services/check`.

### Логи

- `filterLogs(filters)` — `GET /api/logs`, требует `filters.uuid` и поддерживает остальные параметры
  фильтрации из спецификации.
- `ingestLog(payload)` — `POST /api/logs`, отправка лога от клиента (без авторизации).
- `deleteLogs(uuid, filters?)` — `DELETE /api/logs/{uuid}`, возвращает `{ deleted }`.

### Белый список IP

- `getWhitelist()` — `GET /api/settings/whitelist`.
- `upsertWhitelistEntry(payload)` — `POST /api/settings/whitelist`.
- `deleteWhitelist(ip)` — `DELETE /api/settings/whitelist/{ip}`.

### Настройки API

- `getRateLimitSettings()` — `GET /api/settings/rate-limit`, возвращает `{ rateLimitPerMinute }`.
- `updateRateLimitSettings(payload)` — `PUT /api/settings/rate-limit`.
- `getTelegramStatus()` — `GET /api/settings/telegram-status`, отвечает `{ tokenProvided, botStarted }`.
- `getTelegramBotUrl()` — `GET /api/settings/telegram-url`, возвращает `{ url, source, botActive }`.

## Обработка ошибок

Если API возвращает статус `>= 400`, клиент выбрасывает `ApiError` с полями:

- `message` — сообщение из ответа (или `HTTP <код>`).
- `status` — HTTP-статус.

```ts
try {
  await client.getProject('unknown');
} catch (error) {
  console.error(error.message); // Not found
}
```

## Пример комплексного использования

```ts
const client = new ApiClient();
await client.login({ username: 'admin', password: 'secret' });

const project = await client.createProject({
  name: 'Orders',
  description: 'Логи сервиса заказов',
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
    message: 'Сбой при обработке заказа',
    tags: ['ORDERS'],
    metadata: { service: 'orders-api' }
  }
});

const logs = await client.getProjectLogs(project.uuid, { level: 'ERROR' });
console.log(logs.logs.length);
```

## Тесты

Все методы покрыты модульными тестами на базе Vitest, которые эмулируют ответы API и проверяют
правильность построения запросов и обработку токена.
