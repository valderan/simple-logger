# Структура базы данных

MongoDB используется как основное хранилище. Ниже перечислены ключевые коллекции и их поля.

## Коллекция `projects`

| Поле | Тип | Описание |
|------|-----|----------|
| `uuid` | string | Уникальный идентификатор проекта. Служит ключом для API. |
| `name` | string | Название сервиса. |
| `description` | string | Описание. |
| `logFormat` | object | JSON-шаблон ожидаемого лога. |
| `defaultTags` | string[] | Базовые теги. |
| `customTags` | string[] | Пользовательские теги. |
| `accessLevel` | enum | Режим доступа: `global`, `whitelist`, `docker`. |
| `telegramNotify` | object | Настройки telegram-уведомлений. |
| `debugMode` | boolean | При `true` уведомления не отправляются. |
| `createdAt/updatedAt` | date | Метки времени. |

## Коллекция `logs`

| Поле | Тип | Описание |
|------|-----|----------|
| `projectUuid` | string | UUID проекта. |
| `level` | string | Уровень логирования. |
| `message` | string | Сообщение. |
| `tags` | string[] | Теги. |
| `timestamp` | date | Время события. |
| `metadata` | object | Информация об IP, сервисе, пользователе и т.д. |

## Коллекция `pingservices`

| Поле | Тип | Описание |
|------|-----|----------|
| `projectUuid` | string | Ссылка на проект. |
| `name` | string | Название сервиса. |
| `url` | string | Проверяемый URL. |
| `interval` | number | Интервал проверки (сек). |
| `lastStatus` | enum | `ok`, `degraded`, `down`. |
| `lastCheckedAt` | date | Время последней проверки. |
| `telegramTags` | string[] | Теги для уведомлений. |

## Коллекция `whitelists`

| Поле | Тип | Описание |
|------|-----|----------|
| `ip` | string | Разрешенный IP. |
| `description` | string | Комментарий. |
| `createdAt` | date | Дата добавления. |

API возвращает дополнительное поле `isProtected`, помечающее записи, автоматически добавленные через переменную `ADMIN_IP`.【F:api/src/api/services/whitelist.ts†L31-L96】

## Системные требования безопасности

- При первом запуске создается проект `logger-system` для внутренних событий.
- Неверные UUID логов фиксируются в коллекции `logs` с уровнем `SECURITY`.
- Белый список используется middleware `ipWhitelist`, чтобы помечать доверенные IP и отключать для них глобальный rate limit.
