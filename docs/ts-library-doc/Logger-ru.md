# Logger

Класс `Logger` предоставляет высокоуровневый интерфейс для централизованного логирования
клиентских приложений с одновременной работой трёх транспортов: отправка в Simple Logger API,
вывод в консоль и сохранение на диск. Логгер реализован в формате Singleton, поэтому во всём
приложении используется единый экземпляр.

## Установка

```bash
npm install @simple-logger/ts-library
```

## Быстрый старт

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

logger.info('Приложение стартовало');
```

## Основные возможности

- Поддержка уровней `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`.
- Независимое включение и отключение транспортов.
- Очередь с ограничением скорости отправки в API (по умолчанию 120 сообщений в минуту).
- Очередь сохранения на диск с ограничением количества записей и контролем размера файлов (до 2 МБ).
- Пользовательские шаблоны для формирования JSON лога.
- Автоматическое дополнение стандартного шаблона метаданными (`timestamp`, `metadata.ip`).
- Проверка доступности API перед отправкой очереди.

## Конфигурация конструктора

Метод `Logger.getInstance(options)` принимает объект `LoggerOptions`:

| Свойство | Тип | Описание |
| --- | --- | --- |
| `apiBaseUrl` | `string` | Базовый URL Simple Logger API. |
| `defaultProjectUuid` | `string` | UUID проекта для отправки логов. |
| `rateLimitPerMinute` | `number` | Лимит сообщений в минуту для API. |
| `transports` | `{ api?: boolean; console?: boolean; file?: boolean; }` | Включение транспортов. |
| `templates` | `Record<string, LogTemplate>` | Пользовательские шаблоны. |
| `activeTemplate` | `string` | Имя шаблона по умолчанию. |
| `consoleTemplate` | `(level, record) => string` | Форматтер вывода в консоль. |
| `fileTransport` | `FileTransportOptions` | Настройки файлового транспорта. |
| `environment` | `string` | При значении `production` уровень `DEBUG` отключается. |
| `defaultMetadata` | `LogMetadata` | Метаданные для стандартного шаблона. |

### Настройки файлового транспорта

| Свойство | Тип | Описание |
| --- | --- | --- |
| `enabled` | `boolean` | Включение транспорта. |
| `format` | `'json' \| 'csv' \| 'txt'` | Формат файла. |
| `filePath` | `string` | Путь к файлу. |
| `flushIntervalMs` | `number` | Интервал выгрузки очереди. |
| `recordsPerInterval` | `number` | Количество записей за интервал. |
| `maxFileSizeBytes` | `number` | Максимальный размер файла. |

## Методы логирования

Каждый уровень имеет короткий метод:

- `debug(message, options?)`
- `info(message, options?)`
- `warning(message, options?)`
- `error(message, options?)`
- `critical(message, options?)`

`options` расширяет базовую структуру `LogRecordInput` и поддерживает поля:

- `tags?: string[]`
- `metadata?: LogMetadata`
- `templateName?: string` — выбор шаблона на лету.
- `projectUuid?: string` — переопределение проекта.
- `consoleTemplate?: (level, record) => string` — формат вывода конкретного сообщения.
- Дополнительные произвольные поля, которые будут переданы в шаблон.

Пример отправки критического сообщения с кастомным шаблоном:

```ts
logger.registerTemplate('minimal', (level, record) => ({
  level,
  message: record.message,
  tags: record.tags,
  custom: record.customField
}));

logger.critical('Необработанное исключение', {
  templateName: 'minimal',
  projectUuid: '...uuid...',
  tags: ['BACKEND'],
  customField: { stack: '...' }
});
```

## Управление транспортами и очередями

- `setTransportEnabled('api' \| 'console' \| 'file', enabled)` — переключение транспорта.
- `setLevelEnabled(level, enabled)` — включение/выключение уровня.
- `setRateLimit(value)` — смена лимита сообщений в минуту (применяется сразу).
- `getApiQueueStatus()` — вернуть объект `{ pending, estimatedMs, rateLimitPerMinute }`.
- `clearApiQueue()` и `waitForApiQueue()` — управление очередью API.
- `getFileQueueStatus()` и `flushFileQueue()` — контроль очереди файлов.
- `registerTemplate(name, template)` и `setActiveTemplate(name)` — работа с шаблонами.

## Особенности реализации

- Перед первой отправкой очереди API выполняется запрос `GET /health`. Если сервер недоступен,
  очередь очищается и выводится сообщение в консоль.
- Запись в файл выполняется асинхронно, но с локальной очередью и ограничением количества операций,
  чтобы избежать частого обращения к диску.
- При превышении лимита размера файла автоматически создаётся новый файл с меткой времени в имени.
- В CSV формате данные хранятся в одном столбце `payload` с JSON-представлением записи, что гарантирует
  совместимость с произвольными шаблонами.

## Завершение работы приложения

Перед остановкой процесса рекомендуется вызвать:

```ts
await logger.waitForApiQueue();
await logger.flushFileQueue();
```

Это гарантирует, что все накопленные сообщения отправлены и записаны.
