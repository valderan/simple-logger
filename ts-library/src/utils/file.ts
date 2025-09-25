/**
 * Утилиты работы с файловой очередью логов и ограничением размера файлов.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { FileQueueStatus, FileTransportOptions, LogLevel, LogRecordInput } from '../types.js';

/**
 * Элемент очереди файлового транспорта.
 */
export interface FileQueueItem {
  /** Уровень логирования. */
  level: LogLevel;
  /** Итоговый JSON, сформированный активным шаблоном. */
  payload: Record<string, unknown>;
  /** Исходные данные лога для текстового представления. */
  record: LogRecordInput;
  /** Метка времени события. */
  timestamp: string;
}

/**
 * Очередь, выполняющая отложенную запись логов в файловую систему.
 */
export class FileQueue {
  /** Текущие настройки файлового транспорта. */
  private options: FileTransportOptions;
  /** Собственно очередь записей. */
  private queue: FileQueueItem[] = [];
  /** Таймер периодической выгрузки. */
  private timer?: ReturnType<typeof setInterval>;
  /** Активный файл, в который выполняется запись. */
  private currentFilePath: string;
  /** Флаг записи заголовка CSV. */
  private csvHeaderWritten = false;

  constructor(options: FileTransportOptions) {
    this.options = options;
    this.currentFilePath = options.filePath;
  }

  /**
   * Возвращает текущее состояние файловой очереди.
   */
  getStatus(): FileQueueStatus {
    return { pending: this.queue.length, filePath: this.currentFilePath };
  }

  /**
   * Обновляет настройки файлового транспорта и перезапускает таймер.
   */
  updateOptions(options: Partial<FileTransportOptions>): void {
    this.options = { ...this.options, ...options };
    if (options.filePath) {
      this.currentFilePath = options.filePath;
      this.csvHeaderWritten = false;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.queue.length > 0) {
      this.ensureTimer();
    }
  }

  /**
   * Добавляет запись в очередь и при необходимости запускает таймер выгрузки.
   */
  enqueue(item: FileQueueItem): void {
    this.queue.push(item);
    if (this.queue.length >= this.options.recordsPerInterval) {
      void this.flush();
    }
    this.ensureTimer();
  }

  /**
   * Принудительная выгрузка всех накопленных записей.
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }
    const batch = this.queue.splice(0, this.options.recordsPerInterval);
    if (batch.length === 0) {
      return;
    }
    await this.writeBatch(batch);
  }

  /**
   * Останавливает таймер и очищает очередь.
   */
  clear(): void {
    this.queue = [];
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Гарантирует, что таймер выгрузки активен.
   */
  private ensureTimer(): void {
    if (!this.timer) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.options.flushIntervalMs);
    }
  }

  /**
   * Записывает пакет записей на диск в выбранном формате.
   */
  private async writeBatch(batch: FileQueueItem[]): Promise<void> {
    switch (this.options.format) {
      case 'json':
        await this.writeJson(batch);
        break;
      case 'csv':
        await this.writeCsv(batch);
        break;
      case 'txt':
        await this.writeTxt(batch);
        break;
      default:
        throw new Error(`Неизвестный формат файла: ${this.options.format}`);
    }
  }

  /**
   * Запись лога в JSON формате (массив объектов).
   */
  private async writeJson(batch: FileQueueItem[]): Promise<void> {
    await this.ensureDirectory(this.currentFilePath);
    let existing: Record<string, unknown>[] = [];
    let reuseExistingFile = true;

    try {
      const raw = await fs.readFile(this.currentFilePath, 'utf-8');
      if (raw.trim().length > 0) {
        existing = JSON.parse(raw) as Record<string, unknown>[];
      } else {
        reuseExistingFile = false;
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      reuseExistingFile = false;
    }

    if (reuseExistingFile) {
      const combined = [...existing, ...batch.map((item) => item.payload)];
      const serialized = JSON.stringify(combined, null, 2);
      const size = Buffer.byteLength(serialized, 'utf-8');
      if (size > this.options.maxFileSizeBytes) {
        this.rotateFile();
        await this.writeJson(batch);
        return;
      }
      await fs.writeFile(this.currentFilePath, serialized, 'utf-8');
    } else {
      const serialized = JSON.stringify(batch.map((item) => item.payload), null, 2);
      if (Buffer.byteLength(serialized, 'utf-8') > this.options.maxFileSizeBytes) {
        this.rotateFile();
        await this.writeJson(batch);
        return;
      }
      await fs.writeFile(this.currentFilePath, serialized, 'utf-8');
    }
  }

  /**
   * Запись лога в CSV формате с единственным столбцом payload.
   */
  private async writeCsv(batch: FileQueueItem[]): Promise<void> {
    await this.ensureDirectory(this.currentFilePath);
    let content = '';
    if (!this.csvHeaderWritten) {
      content += 'payload\n';
      this.csvHeaderWritten = true;
    }
    for (const item of batch) {
      const payload = JSON.stringify(item.payload).replace(/"/g, '""');
      content += `"${payload}"\n`;
    }

    await this.appendWithRotation(content);
  }

  /**
   * Запись лога в произвольный текстовый формат.
   */
  private async writeTxt(batch: FileQueueItem[]): Promise<void> {
    await this.ensureDirectory(this.currentFilePath);
    let content = '';
    for (const item of batch) {
      const tags = Array.isArray(item.record.tags) ? item.record.tags.join(', ') : '';
      const metadata = item.record.metadata ? JSON.stringify(item.record.metadata) : '';
      content += `[${item.timestamp}] ${item.level}: ${item.record.message}`;
      if (tags) {
        content += ` | tags: ${tags}`;
      }
      if (metadata) {
        content += ` | metadata: ${metadata}`;
      }
      content += '\n';
    }
    await this.appendWithRotation(content);
  }

  /**
   * Добавляет данные в конец текущего файла с учётом ограничения размера.
   */
  private async appendWithRotation(content: string): Promise<void> {
    const buffer = Buffer.from(content, 'utf-8');
    const additionalSize = buffer.byteLength;

    try {
      const stats = await fs.stat(this.currentFilePath);
      if (stats.size + additionalSize > this.options.maxFileSizeBytes) {
        this.rotateFile();
        await this.ensureDirectory(this.currentFilePath);
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.csvHeaderWritten = false;
      } else {
        throw error;
      }
    }

    if (!this.csvHeaderWritten && this.options.format === 'csv' && !content.startsWith('payload')) {
      const header = Buffer.from('payload\n', 'utf-8');
      if (header.byteLength + additionalSize > this.options.maxFileSizeBytes) {
        this.rotateFile();
      }
      await fs.appendFile(this.currentFilePath, header);
      this.csvHeaderWritten = true;
    }

    if (buffer.byteLength > this.options.maxFileSizeBytes) {
      throw new Error('Одна запись превышает максимально допустимый размер файла.');
    }

    await fs.appendFile(this.currentFilePath, buffer);
  }

  /**
   * Создаёт директорию для файла, если она отсутствует.
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  /**
   * Формирует новый путь файла при достижении лимита размера.
   */
  private rotateFile(): void {
    const ext = path.extname(this.options.filePath);
    const base = this.options.filePath.slice(0, this.options.filePath.length - ext.length);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentFilePath = `${base}-${timestamp}${ext || ''}`;
    this.csvHeaderWritten = false;
  }
}
