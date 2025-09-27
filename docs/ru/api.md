# REST API Logger

Backend располагается в директории `./api` и предоставляет REST API для управления проектами логирования и приёма событий. Все эндпоинты находятся под префиксом `/api`, полный базовый URL в локальной среде — `http://localhost:3000/api`.

## Базовые сведения

- Формат данных — `application/json`.
- Временные метки передаются в ISO 8601 (UTC).
- Авторизация административных запросов выполняется через заголовок `Authorization: Bearer <token>`.
- Middleware `rateLimiter` и `ipWhitelist` находятся в `src/api/middlewares` и автоматически подключаются в `app.ts`.

## Аутентификация

### POST `/auth/login`

Возвращает токен для доступа к административным разделам.

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "secret"
}
```

Успешный ответ `200 OK`:

```json
{
  "token": "<jwt-like-token>"
}
```

После нескольких неудачных попыток IP может быть заблокирован на час.

## Управление проектами `/projects`

| Метод | Маршрут | Описание |
|-------|---------|----------|
| `POST` | `/` | Создать проект, вернёт UUID. |
| `GET` | `/` | Получить список проектов. |
| `GET` | `/:uuid` | Детали проекта. |
| `PUT` | `/:uuid` | Обновление проекта по UUID. |
| `DELETE` | `/:uuid` | Удаление проекта вместе с логами и ping-сервисами. |
| `GET` | `/:uuid/logs` | Логи конкретного проекта с фильтрами. |
| `POST` | `/:uuid/ping-services` | Добавление ping-сервиса. |
| `GET` | `/:uuid/ping-services` | Список ping-сервисов. |
| `PUT` | `/:uuid/ping-services/:serviceId` | Обновление параметров ping-сервиса. |
| `DELETE` | `/:uuid/ping-services/:serviceId` | Удаление ping-сервиса из проекта. |
| `POST` | `/:uuid/ping-services/check` | Ручной запуск проверки. |
| `GET` | `/:uuid/telegram` | Текущее состояние интеграции с Telegram и deep-link ссылки. |
| `DELETE` | `/:uuid/telegram/recipients/:chatId` | Отписать конкретного получателя и уведомить его. |

Пример создания проекта:

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

Ответ `201 Created` содержит созданный объект с полем `uuid`.

Каждый проект в ответах API дополнительно включает блок `telegramLinks` с глубокими ссылками вида `https://t.me/<bot>?start=ADD_<UUID>` и `https://t.me/<bot>?start=DELETE_<UUID>`, а также объект `telegramBot` с актуальной ссылкой на бота и источником данных. Если бот недоступен, ссылки будут `null`.

Удаление проекта возвращает количество удалённых логов и ping-сервисов:

```json
{
  "message": "Проект удален",
  "deletedLogs": 120,
  "deletedPingServices": 3
}
```

## Работа с логами `/logs`

| Метод | Маршрут | Описание |
|-------|---------|----------|
| `POST` | `/` | Приём лога по UUID проекта (не требует токена). |
| `GET` | `/` | Фильтрация логов (нужен токен). |
| `DELETE` | `/:uuid` | Массовое удаление по фильтрам или удаление конкретной записи (нужен токен). |

Пример отправки лога:

```http
POST /api/logs
Content-Type: application/json

{
  "uuid": "<uuid проекта>",
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

Если структура лога не соответствует ожидаемой, событие записывается в системный проект `logger-system`.

Фильтрация логов поддерживает параметры `uuid`, `level`, `text`, `tag`, `user`, `ip`, `service`, `startDate`, `endDate`, `logId`:

```http
GET /api/logs?uuid=<uuid>&level=ERROR&tag=PAYMENT&startDate=2024-05-01
Authorization: Bearer <token>
```

## Настройки безопасности `/settings`

| Метод | Маршрут | Описание |
|-------|---------|----------|
| `GET` | `/whitelist` | Получить белый список IP. |
| `POST` | `/whitelist` | Добавить IP. |
| `DELETE` | `/whitelist/:ip` | Удалить IP. |
| `GET` | `/rate-limit` | Узнать текущее ограничение запросов в минуту. |
| `PUT` | `/rate-limit` | Изменить значение ограничения запросов в минуту. |
| `GET` | `/telegram-status` | Проверить, настроен ли Telegram-бот и запущен ли polling. |
| `GET` | `/telegram-url` | Получить публичную ссылку на Telegram-бота и источник данных. |

Запрос на добавление IP:

```http
POST /api/settings/whitelist
Authorization: Bearer <token>
Content-Type: application/json

{
  "ip": "192.168.0.10",
  "description": "VPN"
}
```

Для изменения лимита скорости используйте запрос `PUT /api/settings/rate-limit` с телом вида `{ "rateLimitPerMinute": 200 }`.

Чтобы убедиться, что Telegram-бот активен, выполните `GET /api/settings/telegram-status`. Ответ `200 OK` содержит поля `tokenProvided` и `botStarted`, которые показывают наличие ключа `BOT_API_KEY` и успешный запуск polling:

```json
{
  "tokenProvided": true,
  "botStarted": true
}
```

Ссылка на Telegram-бота доступна по запросу `GET /api/settings/telegram-url`. Если переменная окружения `BOT_URL` содержит корректный адрес вида `https://t.me/<botname>`, он возвращается напрямую. При активном боте и отсутствии переменной сервис запрашивает username через Telegram Bot API и формирует ссылку автоматически. Ответ также сообщает источник данных и признак активности:

```json
{
  "url": "https://t.me/devinfotestbot",
  "source": "telegram",
  "botActive": true
}
```

Если ссылка недоступна (например, бот не запущен или у него нет username), поле `url` будет `null`, а `source` примет значение `inactive` или `unknown`.

## Swagger и OpenAPI

Официальное описание API хранится в `api/swaggerapi/openapi.yaml`. Есть два способа работы с ним:

1. Открыть файл в любом редакторе или онлайн-валидаторе Swagger.
2. Запустить готовый контейнер Swagger UI из `docker-compose.dev.yml`:
   ```bash
   cd api
   docker compose -f docker-compose.dev.yml up swagger
   ```
   После сборки интерфейс будет доступен на `http://localhost:3001`, где можно выполнять запросы прямо из браузера.

Файлы маршрутов (`src/api/routes`) и контроллеров (`src/api/controllers`) являются первоисточником для актуализации спецификации.

## Быстрый старт API

```bash
cd api
npm install
npm run build
npm start
```

Для разработки используйте `npm run dev`, для тестов — `npm test`. Docker-файлы `docker-compose.dev.yml` и `docker-compose.prod.yml` содержат готовые сценарии запуска сервиса вместе с MongoDB и Swagger UI.
