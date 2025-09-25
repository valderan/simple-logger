/**
 * Набор тестов для проверки поведения класса Logger.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn()
}));

vi.mock('cross-fetch', () => ({
  __esModule: true,
  default: fetchMock
}));

import { mkdtempSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '../src/logger.js';

const resetSingleton = () => {
  (Logger as unknown as { instance?: Logger }).instance = undefined;
};

describe('Logger', () => {
  beforeEach(() => {
    resetSingleton();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('создаёт singleton и отключает DEBUG в production', () => {
    const logger = Logger.getInstance({ environment: 'production', transports: { console: false, api: false } });
    expect(logger).toBe(Logger.getInstance());
    expect((logger as unknown as { levelState: Record<string, boolean> }).levelState.DEBUG).toBe(false);
  });

  it('отправляет лог в API с учётом rate limit и очереди', async () => {
    vi.useFakeTimers();
    const logger = Logger.getInstance({
      defaultProjectUuid: '00000000-0000-0000-0000-000000000001',
      rateLimitPerMinute: 60,
      transports: { console: false, api: true, file: false }
    });

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) } as Response);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

    logger.info('API message');
    const statusBefore = logger.getApiQueueStatus();
    expect(statusBefore.pending).toBe(1);

    await vi.runOnlyPendingTimersAsync();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, requestInit] = fetchMock.mock.calls[1];
    expect(requestInit).toMatchObject({ method: 'POST' });
    const statusAfter = logger.getApiQueueStatus();
    expect(statusAfter.pending).toBe(0);
  });

  it('сохраняет логи в файл в формате JSON', async () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'logger-'));
    const filePath = path.join(tmpDir, 'log.json');
    const logger = Logger.getInstance({
      transports: { api: false, console: false, file: true },
      fileTransport: {
        enabled: true,
        filePath,
        format: 'json',
        flushIntervalMs: 10,
        recordsPerInterval: 1
      }
    });

    logger.error('file message', { tags: ['TEST'] });
    await logger.flushFileQueue();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as Array<Record<string, unknown>>;
    expect(data[0].level).toBe('ERROR');
    expect(data[0].tags).toEqual(['TEST']);

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('поддерживает пользовательские шаблоны и отключение уровня', () => {
    const logger = Logger.getInstance({ transports: { console: false, api: false } });
    logger.setLevelEnabled('INFO', false);
    const customTemplate = vi.fn().mockReturnValue({ level: 'INFO', message: 'templated' });
    logger.registerTemplate('custom', customTemplate);
    logger.setActiveTemplate('custom');

    logger.info('ignored');
    expect(customTemplate).not.toHaveBeenCalled();

    logger.setLevelEnabled('INFO', true);
    logger.info('active', { templateName: 'custom' });
    expect(customTemplate).toHaveBeenCalledOnce();
  });
});
