/**
 * Вспомогательные классы для управления очередями: отправкой в API и сохранением в файлы.
 */

import type { ApiQueueItem, ApiQueueStatus } from '../types.js';
import { LogLimitExceededError } from '../apiClient.js';

/**
 * Результат обработки элемента очереди API.
 */
export type ApiDispatchFn = (item: ApiQueueItem) => Promise<void>;

/**
 * Очередь с ограничением скорости, используемая для отправки логов в Simple Logger API.
 */
export class RateLimitedQueue {
  /** Текущий лимит отправки сообщений в минуту. */
  private rateLimitPerMinute: number;
  /** Фактический интервал между отправками. */
  private intervalMs: number;
  /** Хранилище очереди. */
  private queue: ApiQueueItem[] = [];
  /** Текущий таймер отправки. */
  private timer?: ReturnType<typeof setInterval>;
  /** Функция, выполняющая отправку элемента. */
  private dispatcher: ApiDispatchFn;
  /** Флаг, указывающий, что доступность сервиса проверена и положительна. */
  private serverAvailable = false;
  /** Пользовательская функция проверки доступности сервера. */
  private availabilityCheck?: () => Promise<boolean>;
  /** Признак отключенного ограничения скорости. */
  private unlimited: boolean;
  /** Флаг выполнения обработки, предотвращающий конкурентные запуски. */
  private processing = false;

  constructor(rateLimitPerMinute: number, dispatcher: ApiDispatchFn, availabilityCheck?: () => Promise<boolean>) {
    this.rateLimitPerMinute = rateLimitPerMinute;
    this.unlimited = rateLimitPerMinute <= 0;
    this.intervalMs = this.unlimited ? 0 : RateLimitedQueue.calculateInterval(rateLimitPerMinute);
    this.dispatcher = dispatcher;
    this.availabilityCheck = availabilityCheck;
  }

  /**
   * Добавляет элемент в очередь и запускает обработчик при необходимости.
   */
  enqueue(item: ApiQueueItem): void {
    this.queue.push(item);
    this.ensureProcessing();
  }

  /**
   * Принудительно очищает очередь, останавливая таймер.
   */
  clear(): void {
    this.queue = [];
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.processing = false;
  }

  /**
   * Возвращает информацию о состоянии очереди и расчётное время обработки.
   */
  getStatus(): ApiQueueStatus {
    return {
      pending: this.queue.length,
      estimatedMs: this.unlimited ? 0 : this.queue.length * this.intervalMs,
      rateLimitPerMinute: this.rateLimitPerMinute
    };
  }

  /**
   * Изменяет лимит скорости и перезапускает таймер при необходимости.
   */
  updateRateLimit(rateLimitPerMinute: number): void {
    this.rateLimitPerMinute = rateLimitPerMinute;
    this.unlimited = rateLimitPerMinute <= 0;
    this.intervalMs = this.unlimited ? 0 : RateLimitedQueue.calculateInterval(rateLimitPerMinute);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.queue.length > 0) {
      this.ensureProcessing();
    }
  }

  /**
   * Запускает обработку очереди, если она ещё не запущена.
   */
  private ensureProcessing(): void {
    if (this.queue.length === 0) {
      return;
    }

    if (this.unlimited) {
      void this.processNext();
      return;
    }

    if (!this.timer) {
      this.timer = setInterval(() => {
        void this.processNext();
      }, this.intervalMs);
    }
  }

  /**
   * Проверяет доступность сервера (если необходимо) и отправляет следующий элемент очереди.
   */
  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }
    this.processing = true;

    try {
      if (this.unlimited) {
        await this.processAllImmediately();
        return;
      }

      const item = this.queue.shift();
      if (!item) {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = undefined;
        }
        return;
      }

      const available = await this.ensureServerAvailable();
      if (!available) {
        console.error('Simple Logger API недоступен. Отправка логов остановлена.');
        this.clear();
        return;
      }

      try {
        await this.dispatcher(item);
      } catch (error) {
        if (error instanceof LogLimitExceededError) {
          console.error('Лимит хранения логов для проекта превышен:', error.message);
        } else {
          console.error('Не удалось отправить лог в API:', error);
        }
      }
    } finally {
      this.processing = false;
      if (this.unlimited && this.queue.length > 0) {
        this.ensureProcessing();
      }
    }
  }

  /**
   * Выполняет асинхронное ожидание опустошения очереди.
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.processing) {
      const delay = this.unlimited ? 10 : this.intervalMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  /**
   * Сбрасывает флаг доступности сервера, чтобы при следующей отправке выполнить повторную проверку.
   */
  resetAvailability(): void {
    this.serverAvailable = false;
  }

  /**
   * Пересчитывает интервал отправки в зависимости от лимита.
   */
  private static calculateInterval(rateLimitPerMinute: number): number {
    const safeLimit = Math.max(rateLimitPerMinute, 1);
    return Math.floor(60000 / safeLimit);
  }

  /**
   * Убеждается в доступности сервера и кеширует результат.
   */
  private async ensureServerAvailable(): Promise<boolean> {
    if (!this.serverAvailable) {
      if (this.availabilityCheck) {
        try {
          this.serverAvailable = await this.availabilityCheck();
        } catch (error) {
          console.error('Не удалось выполнить проверку доступности API:', error);
          this.serverAvailable = false;
        }
      } else {
        this.serverAvailable = true;
      }
    }
    return this.serverAvailable;
  }

  /**
   * Обрабатывает очередь без ограничений, отправляя все элементы последовательно.
   */
  private async processAllImmediately(): Promise<void> {
    const available = await this.ensureServerAvailable();
    if (!available) {
      console.error('Simple Logger API недоступен. Отправка логов остановлена.');
      this.clear();
      return;
    }

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        break;
      }
      try {
        await this.dispatcher(item);
      } catch (error) {
        console.error('Не удалось отправить лог в API:', error);
      }
    }
  }
}
