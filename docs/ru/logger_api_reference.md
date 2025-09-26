# Simple Logger API Reference

Документ описывает REST-эндпоинты серверной части Logger. API построено на Express, все ответы и запросы используют JSON и кодировку UTF-8. Базовый URL в локальной среде: `http://localhost:3000/api`.

## 1. Общие сведения

- Аутентификация: заголовок `Authorization: Bearer <token>` (кроме публичного приёма логов и `/health`).
- Лимиты: rate limiting и IP whitelist подключены глобально (значение лимита по умолчанию 120 запросов/минуту и изменяется через `/api/settings/rate-limit`). Запросы, помеченные белым списком, и проекты с уровнями доступа `whitelist` и `docker` не подпадают под ограничение, а IP из чёрного списка блокируются до удаления записи.
- Формат даты: ISO 8601 (UTC).
- Swagger: `api/swaggerapi/openapi.yaml` или Swagger UI из `docker-compose.dev.yml`.

## 2. Авторизация

### 2.1 POST `/auth/login`

Получение токена администратора.

**Запрос**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "secret"
}
```

**Ответ `200 OK`**
```json
{
  "token": "<jwt-like-token>",
  "expiresIn": 3600
}
```

**Ошибки**
- `401 Unauthorized` — неверные креденшалы.
- `423 Locked` — IP временно заблокирован после множества попыток.

## 3. Проекты `/projects`

### 3.1 POST `/`
Создание проекта. Требуется токен.

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Orders Service",
  "description": "Обработка заказов",
  "logFormat": {"level": "string", "message": "string"},
  "defaultTags": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
  "customTags": ["PAYMENT"],
  "accessLevel": "global",
  "telegramNotify": {
    "enabled": true,
    "recipients": [{"chatId": "123456", "tags": ["ERROR", "CRITICAL"]}],
    "antiSpamInterval": 30
  },
  "debugMode": false
}
```

**Ответ `201 Created`** — объект проекта с полем `uuid`.

### 3.2 GET `/`
Список проектов (последние сверху).

### 3.3 GET `/:uuid`
Карточка проекта по UUID. Ошибка `404` при отсутствии.

### 3.4 PUT `/:uuid`
Обновление проекта. UUID менять нельзя; нарушение приводит к `400 Bad Request`.

### 3.5 DELETE `/:uuid`
Удаление проекта и связанных логов и ping-сервисов (кроме `logger-system`).

**Ответ `200 OK`**
```json
{
  "message": "Проект удален",
  "deletedLogs": 120,
  "deletedPingServices": 3
}
```

### 3.6 GET `/:uuid/logs`
Возврат логов конкретного проекта. Поддерживаемые параметры: `level`, `text`, `tag`, `user`, `ip`, `service`, `startDate`, `endDate`, `logId`.

## 4. Ping-сервисы `/projects/{uuid}/ping-services`

### 4.1 POST `/`
Добавление сервиса мониторинга.

```http
POST /api/projects/{uuid}/ping-services
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Billing health-check",
  "url": "https://billing.example.com/health",
  "interval": 60,
  "telegramTags": ["PING_DOWN"]
}
```

### 4.2 GET `/`
Список ping-сервисов проекта.

### 4.3 POST `/check`
Ручная проверка доступности. Возвращает объект с результатом последней проверки.

### 4.4 PUT `/:serviceId`
Обновление параметров ping-сервиса. Можно передавать только изменяемые поля. После сохранения выполняется мгновенная проверка.

```http
PUT /api/projects/{uuid}/ping-services/{serviceId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "interval": 120,
  "telegramTags": ["PING_DOWN", "CRITICAL"]
}
```

Успешный ответ `200 OK` содержит обновлённый объект сервиса.

### 4.5 DELETE `/:serviceId`
Удаляет ping-сервис из проекта. Возвращает идентификатор удалённого сервиса.

```http
DELETE /api/projects/{uuid}/ping-services/{serviceId}
Authorization: Bearer <token>
```

**Ответ `200 OK`**
```json
{
  "message": "Ping-сервис удален",
  "serviceId": "6650f47f9d3ab00015a81234"
}
```

## 5. Логи `/logs`

### 5.1 POST `/`
Публичный приём логов по UUID проекта.

```http
POST /api/logs
Content-Type: application/json

{
  "uuid": "<uuid>",
  "log": {
    "level": "ERROR",
    "message": "Ошибка оплаты",
    "tags": ["PAYMENT"],
    "timestamp": "2024-05-20T10:00:00.000Z",
    "metadata": {
      "ip": "10.0.0.5",
      "service": "billing",
      "user": "user-1",
      "extra": {"orderId": "A-42"}
    }
  }
}
```

Simple Logger автоматически сохраняет IP-адрес источника запроса в поле `clientIP`, независимо от переданных в `metadata` данных.
В ответе `201 Created` дополнительно возвращается актуальный лимит запросов для проекта.

**Ответ `201 Created`**
```json
{
  "_id": "6650f1c79b9af0001b0d1234",
  "projectUuid": "<uuid>",
  "level": "ERROR",
  "message": "Ошибка оплаты",
  "tags": ["PAYMENT"],
  "timestamp": "2024-05-20T10:00:00.000Z",
  "metadata": {
    "ip": "10.0.0.5",
    "service": "billing",
    "user": "user-1",
    "extra": {"orderId": "A-42"}
  },
  "clientIP": "203.0.113.10",
  "rateLimitPerMinute": 120
}
```

При ошибке структуры событие записывается в `logger-system`.

### 5.2 GET `/`
Фильтрация логов по тем же параметрам, что и `/:uuid/logs`. Требует токен.

### 5.3 DELETE `/:uuid`
Удаление логов проекта. Тело запроса может содержать фильтры (`level`, `tag`, `startDate`, `endDate`, `logId`).

## 6. Настройки `/settings`

### 6.1 GET `/whitelist`
Возвращает массив IP-адресов, которые обходят глобальный rate limit. В ответе присутствуют описание, дата создания и флаг `isProtected` для записей, добавленных автоматически через переменную `ADMIN_IP`.【F:api/src/api/services/whitelist.ts†L31-L96】

### 6.2 POST `/whitelist`
Создаёт или обновляет запись белого списка.

```http
POST /api/settings/whitelist
Authorization: Bearer <token>
Content-Type: application/json

{
  "ip": "192.168.0.10",
  "description": "VPN"
}
```

### 6.3 DELETE `/whitelist/:ip`
Удаляет IP-адрес из белого списка. Попытка удалить административный IP, заданный через `ADMIN_IP`, вернёт `403 Forbidden` с кодом `WHITELIST_PROTECTED`.【F:api/src/api/controllers/settingsController.ts†L55-L65】

### 6.4 GET `/blacklist`
Возвращает действующие и запланированные блокировки IP.

**Ответ `200 OK`**
```json
[
  {
    "_id": "6650f669d4b5c00017da5678",
    "ip": "203.0.113.10",
    "reason": "Подозрительная активность",
    "expiresAt": "2024-09-01T12:00:00.000Z",
    "createdAt": "2024-08-01T08:15:00.000Z",
    "updatedAt": "2024-08-15T08:15:00.000Z"
  }
]
```

### 6.5 POST `/blacklist`
Создаёт новую блокировку IP. Обязательна причина, `expiresAt` можно передать `null` для бессрочного бана.

### 6.6 PUT `/blacklist/:id`
Обновляет существующую блокировку: можно изменить IP, причину или дату окончания.

### 6.7 DELETE `/blacklist/:id`
Удаляет блокировку и моментально снимает запрет для IP.

### 6.8 GET `/rate-limit`
Возвращает текущее значение лимита запросов в минуту (по умолчанию 120).

**Ответ `200 OK`**
```json
{
  "rateLimitPerMinute": 120
}
```

### 6.9 PUT `/rate-limit`
Изменяет лимит запросов в минуту для всего API. Проекты с доступом `whitelist` и `docker` не подпадают под ограничение.

```http
PUT /api/settings/rate-limit
Authorization: Bearer <token>
Content-Type: application/json

{
  "rateLimitPerMinute": 200
}
```

Успешный ответ повторяет новое значение лимита.

### 6.10 GET `/telegram-status`
Проверяет, настроен ли Telegram-бот и запущен ли polling.

```http
GET /api/settings/telegram-status
Authorization: Bearer <token>
```

**Ответ `200 OK`**

```json
{
  "tokenProvided": true,
  "botStarted": true
}
```

### 6.11 GET `/telegram-url`
Возвращает публичную ссылку на Telegram-бота и источник данных.

```http
GET /api/settings/telegram-url
Authorization: Bearer <token>
```

**Ответ `200 OK`**

```json
{
  "url": "https://t.me/devinfotestbot",
  "source": "env",
  "botActive": true
}
```

Поле `url` может быть `null`, если ссылка не определена. Значение `source` принимает одно из `env`, `telegram`, `inactive`, `unknown` и указывает, получена ли ссылка из переменной окружения, через Telegram Bot API, или недоступна из-за неактивного/неизвестного состояния. Флаг `botActive` показывает, запущен ли бот и удалось ли связаться с API Telegram.

## 7. Системные эндпоинты

- `GET /health` — проверка готовности сервиса (без префикса `/api`).

## 8. Обработка ошибок

- `400 Bad Request` — валидация входных данных (детали в `errors` или `message`).
- `401 Unauthorized` — отсутствует или некорректен токен.
- `403 Forbidden` — IP заблокирован (чёрный список) или попытка удалить защищённый IP из белого списка (`ADMIN_IP`).
- `404 Not Found` — сущность не найдена.
- `429 Too Many Requests` — превышение лимитов.
- `500 Internal Server Error` — неожиданные ошибки сервера.

## 9. Инструменты разработчика

- Смотри исходники маршрутов в `api/src/api/routes`.
- Описания запросов и типов — в контроллерах `api/src/api/controllers`.
- Автотесты использования API — в `api/test`.

Эта спецификация дополняет `docs/ru/api.md`, предоставляя детальные примеры и коды ответов.
