/**
 * Типы и интерфейсы, описывающие структуру данных для логгера и клиента Simple Logger API.
 */

/**
 * Доступные уровни логирования в библиотеке.
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Базовая структура входящих данных для записи лога.
 */
export interface LogRecordInput {
  /** Человекочитаемое сообщение лога. */
  message: string;
  /** Необязательный массив тегов для фильтрации. */
  tags?: string[];
  /** Необязательная метаинформация о логе. */
  metadata?: LogMetadata;
  /** Дополнительные пользовательские поля для шаблонов. */
  [key: string]: unknown;
}

/**
 * Дополнительные параметры конкретной операции логирования.
 */
export interface LogOptions extends LogRecordInput {
  /** Имя шаблона, который необходимо использовать для этого сообщения. */
  templateName?: string;
  /** UUID проекта, от имени которого отправляется лог. */
  projectUuid?: string;
  /** Персональный шаблон вывода для консоли. */
  consoleTemplate?: (level: LogLevel, record: LogRecordInput) => string;
}

/**
 * Метаинформация, сопровождающая лог.
 */
export interface LogMetadata {
  /** IP-адрес, откуда отправлен лог. */
  ip?: string;
  /** Название сервиса или компонента. */
  service?: string;
  /** Идентификатор пользователя, связанного с событием. */
  user?: string;
  /** Дополнительные произвольные данные. */
  extra?: Record<string, unknown>;
  /** Позволяет расширять структуру пользовательскими полями. */
  [key: string]: unknown;
}

/**
 * Тип функции, формирующей итоговый JSON лога на основе входных данных и уровня.
 */
export type LogTemplate = (level: LogLevel, payload: LogRecordInput) => Record<string, unknown>;

/**
 * Настройки файла, используемого для хранения логов.
 */
export interface FileTransportOptions {
  /** Включена ли запись логов в файл. */
  enabled: boolean;
  /** Формат целевого файла. */
  format: 'json' | 'csv' | 'txt';
  /** Полный путь к файлу. */
  filePath: string;
  /** Интервал (в миллисекундах) между выгрузками очереди на диск. */
  flushIntervalMs: number;
  /** Количество записей, выгружаемых за один интервал. */
  recordsPerInterval: number;
  /** Максимальный размер файла в байтах. */
  maxFileSizeBytes: number;
}

/**
 * Конфигурация логгера при инициализации.
 */
export interface LoggerOptions {
  /** Базовый URL сервера Simple Logger API. */
  apiBaseUrl?: string;
  /** Текущий лимит отправки логов в API (сообщений в минуту). */
  rateLimitPerMinute?: number;
  /** UUID проекта, используемый по умолчанию для отправки логов. */
  defaultProjectUuid?: string;
  /** Включение отдельных транспортов. */
  transports?: {
    /** Включение отправки логов в API. */
    api?: boolean;
    /** Включение вывода логов в консоль. */
    console?: boolean;
    /** Включение сохранения логов в файл. */
    file?: boolean;
  };
  /** Пользовательские шаблоны логов. */
  templates?: Record<string, LogTemplate>;
  /** Имя активного шаблона по умолчанию. */
  activeTemplate?: string;
  /** Пользовательский шаблон вывода для консоли. */
  consoleTemplate?: (level: LogLevel, record: LogRecordInput) => string;
  /** Настройки файлового транспорта. */
  fileTransport?: Partial<FileTransportOptions>;
  /** Среда выполнения для определения уровней по умолчанию. */
  environment?: string;
  /** Предустановленные метаданные для стандартного шаблона. */
  defaultMetadata?: LogMetadata;
}

/**
 * Внутреннее представление элемента очереди отправки в API.
 */
export interface ApiQueueItem {
  /** Итоговый JSON, отправляемый в Simple Logger API. */
  body: Record<string, unknown>;
  /** Используемый UUID проекта (если применимо). */
  projectUuid?: string;
}

/**
 * Состояние очереди API, возвращаемое пользователю.
 */
export interface ApiQueueStatus {
  /** Количество сообщений, ожидающих отправки. */
  pending: number;
  /** Оценка оставшегося времени до полной отправки (мс). */
  estimatedMs: number;
  /** Текущий активный лимит скорости (сообщений/мин). */
  rateLimitPerMinute: number;
}

/**
 * Состояние файловой очереди, возвращаемое пользователю.
 */
export interface FileQueueStatus {
  /** Количество записей, ожидающих выгрузки на диск. */
  pending: number;
  /** Путь к файлу, связанный с очередью. */
  filePath: string;
}

/**
 * Общая структура ответа об ошибке API.
 */
export interface ErrorResponse {
  message: string;
  details?: unknown;
}

/**
 * Структура ответа авторизации администратора.
 */
export interface AuthResponse {
  token: string;
}

/**
 * Запрос авторизации администратора.
 */
export interface AuthRequest {
  username: string;
  password: string;
}

/**
 * Входные данные для проекта.
 */
export interface ProjectInput {
  name: string;
  description?: string;
  logFormat: Record<string, unknown>;
  defaultTags: string[];
  customTags: string[];
  accessLevel: 'global' | 'whitelist' | 'docker';
  telegramNotify: TelegramSettings;
  debugMode: boolean;
}

/**
 * Описание телеграм-настроек проекта.
 */
export interface TelegramSettings {
  enabled?: boolean;
  recipients?: TelegramRecipient[];
  antiSpamInterval?: number;
}

/**
 * Получатель уведомлений в Telegram.
 */
export interface TelegramRecipient {
  chatId: string;
  tags?: string[];
}

/**
 * Полная модель проекта, возвращаемая API.
 */
export interface Project extends ProjectInput {
  _id: string;
  uuid: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Метаинформация для логов проекта.
 */
export interface ProjectLogMetadata {
  ip?: string;
  service?: string;
  user?: string;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Тело лога проекта.
 */
export interface ProjectLogBody {
  level: LogLevel;
  message: string;
  tags?: string[];
  timestamp?: string;
  metadata?: ProjectLogMetadata;
}

/**
 * Структура записи лога, возвращаемая API.
 */
export interface ProjectLogEntry {
  _id: string;
  projectUuid: string;
  level: LogLevel;
  message: string;
  tags: string[];
  timestamp: string;
  metadata?: ProjectLogMetadata;
}

/**
 * Ответ API при получении логов проекта.
 */
export interface ProjectLogResponse {
  project: Project;
  logs: ProjectLogEntry[];
}

/**
 * Ответ при удалении проекта.
 */
export interface DeleteProjectResponse {
  message: string;
  deletedLogs: number;
  deletedPingServices: number;
}

/**
 * Описание ping-сервиса.
 */
export interface PingServiceInput {
  name: string;
  url: string;
  interval?: number;
  telegramTags?: string[];
}

/**
 * Полная модель ping-сервиса.
 */
export interface PingService extends PingServiceInput {
  _id: string;
  projectUuid: string;
  lastStatus?: 'ok' | 'degraded' | 'down';
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Данные для обновления ping-сервиса.
 */
export interface PingServiceUpdateInput {
  name?: string;
  url?: string;
  interval?: number;
  telegramTags?: string[];
}

/**
 * Ответ при удалении ping-сервиса.
 */
export interface DeletePingServiceResponse {
  message: string;
  serviceId: string;
}

/**
 * Данные белого списка IP.
 */
export interface WhitelistPayload {
  ip: string;
  description?: string;
}

/**
 * Запись белого списка, возвращаемая API.
 */
export interface WhitelistEntry extends WhitelistPayload {
  _id: string;
  createdAt: string;
}

/**
 * Данные для создания записи чёрного списка IP.
 */
export interface BlacklistPayload {
  ip: string;
  reason: string;
  expiresAt?: string | null;
}

/**
 * Данные для обновления записи чёрного списка IP.
 */
export interface BlacklistUpdatePayload {
  ip?: string;
  reason?: string;
  expiresAt?: string | null;
}

/**
 * Запись чёрного списка, возвращаемая API.
 */
export interface BlacklistEntry extends BlacklistPayload {
  _id: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

/**
 * Параметры фильтрации логов в API.
 */
export interface LogFilterParameters {
  uuid?: string;
  level?: LogLevel;
  text?: string;
  tag?: string;
  user?: string;
  ip?: string;
  service?: string;
  startDate?: string;
  endDate?: string;
  logId?: string;
}

/**
 * Результат удаления логов.
 */
export interface DeleteLogsResponse {
  deleted: number;
}

/**
 * Ответ на удаление IP из белого списка.
 */
export interface DeleteWhitelistResponse {
  success: boolean;
}

/**
 * Ответ на удаление IP из чёрного списка.
 */
export interface DeleteBlacklistResponse {
  success: boolean;
}

/**
 * Настройки ограничения скорости API.
 */
export interface RateLimitSettings {
  rateLimitPerMinute: number;
}

/**
 * Статус Telegram-бота, возвращаемый API настроек.
 */
export interface TelegramStatus {
  tokenProvided: boolean;
  botStarted: boolean;
}

/**
 * Информация о публичной ссылке Telegram-бота.
 */
export interface TelegramBotUrlInfo {
  url: string | null;
  source: 'env' | 'telegram' | 'inactive' | 'unknown';
  botActive: boolean;
}

/**
 * Состояние здорового сервиса.
 */
export interface HealthResponse {
  status: string;
}

/**
 * Параметры записи лога через API.
 */
export interface LogIngestRequest {
  uuid: string;
  log: ProjectLogBody;
}

/**
 * Текущие настройки транспортов после инициализации логгера.
 */
export interface ActiveTransports {
  api: boolean;
  console: boolean;
  file: boolean;
}
