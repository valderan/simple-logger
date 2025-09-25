##### English version: [README_EN.md](README_EN.md)

<p align="center">
  <img src="./client/public/logo_light.png" alt="Simple Logger Logo" width="160" height=auto/>
</p>

# Лёгкий сервис централизованного логирования

**Simple Logger** — это способ быстро добавить наблюдаемость в небольшой проект без развёртывания громоздких систем мониторинга. Сервер принимает JSON-логи по HTTP, хранит их в MongoDB, уведомляет о проблемах через Telegram и предоставляет удобный веб-интерфейс для анализа. Для небольших и средних команд такой инструмент часто незаменим: вместо сложного стека достаточно поднять один сервис и получать всю нужную информацию.


## Документация Simple Logger

Сервис собирает структурированные логи, отслеживает доступность сервисов и рассылает уведомления в Telegram. В репозитории есть подробные материалы по архитектуре, API, безопасности и клиентским инструментам:

- Обзор и архитектура: [docs/ru/about.md](docs/ru/about.md) · [docs/en/about.md](docs/en/about.md), [docs/ru/architecture.md](docs/ru/architecture.md) · [docs/en/architecture.md](docs/en/architecture.md)
- Безопасность и настройки API: [docs/ru/api_security.md](docs/ru/api_security.md) · [docs/en/api_security.md](docs/en/api_security.md), [docs/api_security_improvements.md](docs/api_security_improvements.md)
- Клиент и SDK: [docs/ru/client.md](docs/ru/client.md) · [docs/en/client.md](docs/en/client.md), [docs/ts-library-doc/Logger-ru.md](docs/ts-library-doc/Logger-ru.md) · [docs/ts-library-doc/Logger-en.md](docs/ts-library-doc/Logger-en.md)

## Возможности

- Приём, хранение и фильтрация логов по UUID проекта.
- Ping-мониторинг HTTP-сервисов с ручным запуском проверок.
- Telegram-оповещения по тегам и инцидентам.
- Белый список IP и rate limiting для защиты API.
- Веб-клиент с тёмной/светлой темой, поиском и детальным просмотром событий.

## Компоненты проекта

| Каталог | Описание |
|---------|----------|
| `api/` | Node.js + Express REST API, модели MongoDB, интеграция с Telegram, docker-compose для dev/prod и спецификация OpenAPI. |
| `client/` | React + TypeScript интерфейс на Vite, сборка в виде статического SPA и образ Nginx для публикации. |
| `docs/` | Документация на русском и английском языках, структура БД и руководство по клиенту. |
| `docs/examples/` | Готовые скрипты для интеграции с API на Bash, Go, Python и TypeScript. |
| `ts-library/` | TypeScript библиотека для работы с API и логированием, готовая к публикации в npm. |

## TypeScript библиотека

В репозитории доступна клиентская библиотека `ts-library`, предоставляющая два класса:

- `Logger` — многофункциональный логгер с поддержкой очередей, шаблонов и нескольких транспортов.
- `ApiClient` — типизированный клиент для всех маршрутов Simple Logger API.

Документация и примеры использования:

- [Logger (ru)](docs/ts-library-doc/Logger-ru.md) / [Logger (en)](docs/ts-library-doc/Logger-en.md)
- [ApiClient (ru)](docs/ts-library-doc/ApiClient-ru.md) / [ApiClient (en)](docs/ts-library-doc/ApiClient-en.md)

Собрать пакет можно командами `npm install`, `npm run build`, `npm test` в директории `ts-library`.

## Как запустить API

### Локально

```bash
cd api
npm install
npm run build
npm start
```

Переменные окружения:

- `MONGO_URI` — строка подключения к MongoDB (по умолчанию `mongodb://localhost:27017/logger`).
- `ADMIN_USER`, `ADMIN_PASS` — учётные данные администратора.
- `BOT_API_KEY` — токен Telegram-бота (опционально).

Во время разработки удобно использовать:

```bash
npm run dev
```

Для запуска тестов:

```bash
npm test
```

### В Docker

Разработческая среда со Swagger UI и MongoDB:

```bash
cd api
docker compose -f docker-compose.dev.yml up --build
```

Продакшен-вариант:

```bash
cd api
docker compose -f docker-compose.prod.yml up --build -d
```

API по умолчанию доступен на `http://localhost:3000`, Swagger UI — на `http://localhost:3001`.

## Как запустить клиент

### Локально

```bash
cd client
npm install
npm run dev
```

По умолчанию Vite поднимает dev-сервер на `http://localhost:5173`. Настройте URL API через `VITE_API_URL` (например, `http://localhost:3000/api`). Дополнительные переменные: `LOGGER_VERSION`, `LOGGER_PAGE_URL`.

### В Docker

```bash
cd client
docker compose up --build
```

Контейнер соберёт production-бандл и раздаст его через Nginx на порту `80`. Значения `API_URL`, `LOGGER_VERSION`, `LOGGER_PAGE_URL` передаются в процессе сборки.

## Документация

- Русская версия: [docs/ru/about.md](docs/ru/about.md), [docs/ru/architecture.md](docs/ru/architecture.md), [docs/ru/database.md](docs/ru/database.md), [docs/ru/api.md](docs/ru/api.md), [docs/ru/logger_api_reference.md](docs/ru/logger_api_reference.md), [docs/ru/client.md](docs/ru/client.md), [docs/ru/api_security.md](docs/ru/api_security.md), [docs/api_security_improvements.md](docs/api_security_improvements.md).
- [Скриншоты клиента](docs/screenshots/) - docs/screenshots
- Английская версия: [docs/en/about.md](docs/en/about.md), [docs/en/architecture.md](docs/en/architecture.md), [docs/en/database.md](docs/en/database.md), [docs/en/api.md](docs/en/api.md), [docs/en/logger_api_reference.md](docs/en/logger_api_reference.md), [docs/en/client.md](docs/en/client.md), [docs/en/api_security.md](docs/en/api_security.md).

## Примеры интеграции

Каждый подкаталог содержит готовые сценарии, демонстрирующие полный цикл работы с API.

### Bash

- [login.sh](docs/examples/bash/login.sh) — получение токена администратора.
- [create_project.sh](docs/examples/bash/create_project.sh) — создание проекта и вывод UUID.
- [ingest_log.sh](docs/examples/bash/ingest_log.sh) — отправка валидного лога.
- [filter_logs.sh](docs/examples/bash/filter_logs.sh) — выборка логов с параметрами.
- [add_ping_service.sh](docs/examples/bash/add_ping_service.sh) — регистрация ping-сервиса.

### Python

- [login.py](docs/examples/python/login.py) — авторизация и сохранение токена.
- [create_project.py](docs/examples/python/create_project.py) — создание проекта через requests.
- [ingest_log.py](docs/examples/python/ingest_log.py) — отправка события с дополнительными метаданными.
- [filter_logs.py](docs/examples/python/filter_logs.py) — фильтрация логов и вывод в консоль.
- [add_ping_service.py](docs/examples/python/add_ping_service.py) — добавление проверки доступности.

### Go

- [login.go](docs/examples/go/login.go) — получение JWT с использованием стандартной библиотеки.
- [create_project.go](docs/examples/go/create_project.go) — пример сериализации структуры проекта.
- [ingest_log.go](docs/examples/go/ingest_log.go) — отправка логов с кастомными тегами.
- [filter_logs.go](docs/examples/go/filter_logs.go) — запрос логов с параметрами фильтрации.
- [trigger_ping_check.go](docs/examples/go/trigger_ping_check.go) — ручной запуск проверки ping-сервиса.

### TypeScript

- [login.ts](docs/examples/typescript/login.ts) — авторизация через `node-fetch`.
- [loggerClient.ts](docs/examples/typescript/loggerClient.ts) — обёртка над API с повторным использованием токена.
- [ingestLog.ts](docs/examples/typescript/ingestLog.ts) — пример отправки лога с типизацией.
- [listProjects.ts](docs/examples/typescript/listProjects.ts) — получение списка проектов.
- [deleteLogs.ts](docs/examples/typescript/deleteLogs.ts) — массовое удаление логов по фильтрам.

## Дополнительно

- Страница готовности API: `GET http://localhost:3000/health`.
- Приложение поддерживает светлую и тёмную тему, локализацию интерфейса и хранит фильтры логов в URL.
- Следите за изменениями в [CHANGELOG.md](CHANGELOG.md).

