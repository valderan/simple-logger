/**
 * Вспомогательные классы для управления очередями: отправкой в API и сохранением в файлы.
 */

import type { ApiQueueItem, ApiQueueStatus } from '../types.js';

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

  constructor(rateLimitPerMinute: number, dispatcher: ApiDispatchFn, availabilityCheck?: () => Promise<boolean>) {
    this.rateLimitPerMinute = rateLimitPerMinute;
    this.intervalMs = RateLimitedQueue.calculateInterval(rateLimitPerMinute);
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
  }

  /**
   * Возвращает информацию о состоянии очереди и расчётное время обработки.
   */
  getStatus(): ApiQueueStatus {
    return {
      pending: this.queue.length,
      estimatedMs: this.queue.length * this.intervalMs,
      rateLimitPerMinute: this.rateLimitPerMinute
    };
  }

  /**
   * Изменяет лимит скорости и перезапускает таймер при необходимости.
   */
  updateRateLimit(rateLimitPerMinute: number): void {
    this.rateLimitPerMinute = rateLimitPerMinute;
    this.intervalMs = RateLimitedQueue.calculateInterval(rateLimitPerMinute);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      this.ensureProcessing();
    }
  }

  /**
   * Запускает обработку очереди, если она ещё не запущена.
   */
  private ensureProcessing(): void {
    if (!this.timer && this.queue.length > 0) {
      this.timer = setInterval(() => {
        void this.processNext();
      }, this.intervalMs);
    }
  }

  /**
   * Проверяет доступность сервера (если необходимо) и отправляет следующий элемент очереди.
   */
  private async processNext(): Promise<void> {
    const item = this.queue.shift();
    if (!item) {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
      return;
    }

    if (!this.serverAvailable) {
      if (this.availabilityCheck) {
        this.serverAvailable = await this.availabilityCheck();
      } else {
        this.serverAvailable = true;
      }
    }

    if (!this.serverAvailable) {
      console.error('Simple Logger API недоступен. Отправка логов остановлена.');
      this.clear();
      return;
    }

    try {
      await this.dispatcher(item);
    } catch (error) {
      console.error('Не удалось отправить лог в API:', error);
    }
  }

  /**
   * Выполняет асинхронное ожидание опустошения очереди.
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.intervalMs));
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
}
