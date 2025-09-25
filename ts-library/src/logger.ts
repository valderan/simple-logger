/**
 * Реализация клиентского логгера с поддержкой нескольких транспортов и шаблонов сообщений.
 */

import fetch from 'cross-fetch';
import type {
  ActiveTransports,
  ApiQueueItem,
  ApiQueueStatus,
  FileQueueStatus,
  LogLevel,
  LogOptions,
  LogRecordInput,
  LogTemplate,
  LoggerOptions
} from './types.js';
import { RateLimitedQueue } from './utils/queue.js';
import { FileQueue, type FileQueueItem } from './utils/file.js';

const DEFAULT_TEMPLATE_NAME = 'default';
const DEFAULT_FILE_OPTIONS = {
  enabled: false,
  format: 'json' as const,
  filePath: 'logs/simple-logger.json',
  flushIntervalMs: 5000,
  recordsPerInterval: 50,
  maxFileSizeBytes: 2 * 1024 * 1024
};

/**
 * Конфигурация уровней логирования по умолчанию.
 */
const DEFAULT_LEVEL_STATE: Record<LogLevel, boolean> = {
  DEBUG: true,
  INFO: true,
  WARNING: true,
  ERROR: true,
  CRITICAL: true
};

/**
 * Основной класс логгера, реализующий шаблон Singleton.
 */
export class Logger {
  /** Единственный экземпляр логгера. */
  private static instance?: Logger;
  /** Базовый URL сервера API. */
  private apiBaseUrl: string;
  /** Активные транспорты. */
  private transports: ActiveTransports;
  /** Очередь с ограничением скорости для API. */
  private apiQueue: RateLimitedQueue;
  /** Очередь файлового транспорта. */
  private fileQueue?: FileQueue;
  /** Доступные шаблоны логов. */
  private templates: Map<string, LogTemplate>;
  /** Имя активного шаблона. */
  private activeTemplate: string;
  /** Шаблон вывода в консоль. */
  private consoleTemplate: (level: LogLevel, record: LogRecordInput) => string;
  /** Лимит отправки сообщений в минуту. */
  private rateLimitPerMinute: number;
  /** Метаданные по умолчанию для стандартного шаблона. */
  private defaultMetadata: LogRecordInput['metadata'];
  /** Состояние включённости уровней логирования. */
  private levelState: Record<LogLevel, boolean>;
  /** UUID проекта, используемый по умолчанию. */
  private defaultProjectUuid?: string;

  private constructor(options: LoggerOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? 'http://localhost:3000';
    this.rateLimitPerMinute = options.rateLimitPerMinute ?? 120;
    this.defaultProjectUuid = options.defaultProjectUuid;
    this.defaultMetadata = options.defaultMetadata ?? { ip: 'unknown' };
    this.levelState = { ...DEFAULT_LEVEL_STATE };

    if (options.environment === 'production') {
      this.levelState.DEBUG = false;
    }

    this.transports = {
      api: options.transports?.api ?? true,
      console: options.transports?.console ?? true,
      file: options.transports?.file ?? false
    };

    this.templates = new Map();
    this.templates.set(DEFAULT_TEMPLATE_NAME, (level, record) => this.defaultTemplate(level, record));
    if (options.templates) {
      Object.entries(options.templates).forEach(([name, template]) => {
        this.templates.set(name, template);
      });
    }
    this.activeTemplate = options.activeTemplate ?? DEFAULT_TEMPLATE_NAME;

    this.consoleTemplate =
      options.consoleTemplate ??
      ((level, record) => {
        const timestamp = new Date().toISOString();
        const tags = record.tags ? `[${record.tags.join(', ')}]` : '';
        return `${timestamp} ${level.padEnd(8)} ${tags} ${record.message}`.trim();
      });

    const fileOptions = { ...DEFAULT_FILE_OPTIONS, ...options.fileTransport };
    if (fileOptions.enabled) {
      this.fileQueue = new FileQueue(fileOptions);
    }

    this.apiQueue = new RateLimitedQueue(
      this.rateLimitPerMinute,
      (item) => this.dispatchToApi(item),
      () => this.checkApiAvailability()
    );
  }

  /**
   * Получение экземпляра логгера. Повторные вызовы обновляют конфигурацию.
   */
  static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    } else if (options) {
      Logger.instance.configure(options);
    }
    return Logger.instance;
  }

  /**
   * Обновляет настройки существующего логгера.
   */
  configure(options: LoggerOptions): void {
    const baseChanged = options.apiBaseUrl && options.apiBaseUrl !== this.apiBaseUrl;
    this.apiBaseUrl = options.apiBaseUrl ?? this.apiBaseUrl;
    if (baseChanged) {
      this.apiQueue.resetAvailability();
    }
    this.rateLimitPerMinute = options.rateLimitPerMinute ?? this.rateLimitPerMinute;
    this.defaultProjectUuid = options.defaultProjectUuid ?? this.defaultProjectUuid;
    if (options.defaultMetadata) {
      this.defaultMetadata = options.defaultMetadata;
    }
    if (options.environment) {
      this.levelState = { ...DEFAULT_LEVEL_STATE };
      if (options.environment === 'production') {
        this.levelState.DEBUG = false;
      }
    }
    if (options.transports) {
      this.transports = {
        api: options.transports.api ?? this.transports.api,
        console: options.transports.console ?? this.transports.console,
        file: options.transports.file ?? this.transports.file
      };
    }
    if (options.consoleTemplate) {
      this.consoleTemplate = options.consoleTemplate;
    }
    if (options.templates) {
      Object.entries(options.templates).forEach(([name, template]) => {
        this.templates.set(name, template);
      });
    }
    if (options.activeTemplate) {
      this.activeTemplate = options.activeTemplate;
    }
    this.apiQueue.updateRateLimit(this.rateLimitPerMinute);
    if (options.fileTransport) {
      const fileOptions = { ...DEFAULT_FILE_OPTIONS, ...options.fileTransport };
      if (fileOptions.enabled) {
        if (!this.fileQueue) {
          this.fileQueue = new FileQueue(fileOptions);
        } else {
          this.fileQueue.updateOptions(fileOptions);
        }
      } else if (this.fileQueue) {
        this.fileQueue.clear();
        this.fileQueue = undefined;
      }
    }
  }

  /**
   * Включает или отключает указанный уровень логирования.
   */
  setLevelEnabled(level: LogLevel, enabled: boolean): void {
    this.levelState[level] = enabled;
  }

  /**
   * Устанавливает активный шаблон логов.
   */
  setActiveTemplate(name: string): void {
    if (!this.templates.has(name)) {
      throw new Error(`Шаблон ${name} не зарегистрирован.`);
    }
    this.activeTemplate = name;
  }

  /**
   * Регистрирует новый шаблон.
   */
  registerTemplate(name: string, template: LogTemplate): void {
    this.templates.set(name, template);
  }

  /**
   * Изменяет активность транспорта.
   */
  setTransportEnabled(transport: keyof ActiveTransports, enabled: boolean): void {
    this.transports[transport] = enabled;
  }

  /**
   * Возвращает состояние очереди API.
   */
  getApiQueueStatus(): ApiQueueStatus {
    return this.apiQueue.getStatus();
  }

  /**
   * Возвращает состояние файловой очереди.
   */
  getFileQueueStatus(): FileQueueStatus | undefined {
    return this.fileQueue?.getStatus();
  }

  /**
   * Очищает очередь API.
   */
  clearApiQueue(): void {
    this.apiQueue.clear();
  }

  /**
   * Очищает очередь файлового транспорта.
   */
  clearFileQueue(): void {
    this.fileQueue?.clear();
  }

  /**
   * Принудительно выгружает логи на диск.
   */
  async flushFileQueue(): Promise<void> {
    if (this.fileQueue) {
      await this.fileQueue.flush();
    }
  }

  /**
   * Изменяет лимит отправки сообщений в API.
   */
  setRateLimit(rateLimitPerMinute: number): void {
    this.rateLimitPerMinute = rateLimitPerMinute;
    this.apiQueue.updateRateLimit(rateLimitPerMinute);
  }

  /**
   * Асинхронное ожидание опустошения очереди API.
   */
  async waitForApiQueue(): Promise<void> {
    await this.apiQueue.drain();
  }

  /**
   * Записывает сообщение уровня DEBUG.
   */
  debug(message: string, options: Omit<LogOptions, 'message'> = {}): void {
    this.log('DEBUG', { ...options, message });
  }

  /**
   * Записывает сообщение уровня INFO.
   */
  info(message: string, options: Omit<LogOptions, 'message'> = {}): void {
    this.log('INFO', { ...options, message });
  }

  /**
   * Записывает сообщение уровня WARNING.
   */
  warning(message: string, options: Omit<LogOptions, 'message'> = {}): void {
    this.log('WARNING', { ...options, message });
  }

  /**
   * Записывает сообщение уровня ERROR.
   */
  error(message: string, options: Omit<LogOptions, 'message'> = {}): void {
    this.log('ERROR', { ...options, message });
  }

  /**
   * Записывает сообщение уровня CRITICAL.
   */
  critical(message: string, options: Omit<LogOptions, 'message'> = {}): void {
    this.log('CRITICAL', { ...options, message });
  }

  /**
   * Базовый метод, обрабатывающий логи перед передачей в транспорты.
   */
  log(level: LogLevel, options: LogOptions): void {
    if (!this.levelState[level]) {
      return;
    }
    const {
      templateName: templateOverride,
      projectUuid,
      consoleTemplate,
      message,
      tags,
      metadata,
      ...rest
    } = options;
    const templateName = templateOverride ?? this.activeTemplate;
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Шаблон ${templateName} не найден.`);
    }
    const record: LogRecordInput = {
      message,
      tags,
      metadata,
      ...rest
    };
    const payload = template(level, record);
    const timestamp = (payload.timestamp as string) ?? new Date().toISOString();

    if (this.transports.console) {
      const printer = consoleTemplate ?? this.consoleTemplate;
      // eslint-disable-next-line no-console
      console.log(printer(level, record));
    }

    if (this.transports.api) {
      const projectUuidToUse = projectUuid ?? this.defaultProjectUuid;
      if (!projectUuidToUse) {
        console.warn('UUID проекта не задан. Лог не будет отправлен в API.');
      } else {
        const apiPayload: ApiQueueItem = {
          body: {
            uuid: projectUuidToUse,
            log: payload
          }
        };
        this.apiQueue.enqueue(apiPayload);
      }
    }

    if (this.transports.file && this.fileQueue) {
      const item: FileQueueItem = {
        level,
        payload,
        record,
        timestamp
      };
      this.fileQueue.enqueue(item);
    }
  }

  /**
   * Стандартный шаблон логов со встроенными метаданными.
   */
  private defaultTemplate(level: LogLevel, record: LogRecordInput): Record<string, unknown> {
    const baseMetadata = record.metadata ? { ...this.defaultMetadata, ...record.metadata } : { ...this.defaultMetadata };
    if (!baseMetadata?.ip) {
      baseMetadata.ip = 'unknown';
    }
    const enrichedRecord = record as LogRecordInput & { timestamp?: string };
    const { message, tags, metadata, ...rest } = enrichedRecord;
    const timestamp = enrichedRecord.timestamp ?? new Date().toISOString();
    return {
      level,
      message,
      tags: tags && tags.length > 0 ? tags : ['MAIN'],
      timestamp,
      metadata: metadata ? baseMetadata : { ...baseMetadata },
      ...rest
    };
  }

  /**
   * Отправка подготовленного сообщения в Simple Logger API.
   */
  private async dispatchToApi(item: ApiQueueItem): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item.body)
    });
    if (!response.ok) {
      throw new Error(`Ошибка API: ${response.status}`);
    }
  }

  /**
   * Проверка доступности API перед запуском отправки очереди.
   */
  private async checkApiAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Не удалось проверить доступность API:', error);
      return false;
    }
  }
}
