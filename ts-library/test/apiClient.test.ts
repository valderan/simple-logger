/**
 * Набор тестов для проверки клиента ApiClient.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn()
}));

vi.mock('cross-fetch', () => ({
  __esModule: true,
  default: fetchMock
}));

import { ApiClient } from '../src/apiClient.js';

beforeEach(() => {
  fetchMock.mockReset();
});

describe('ApiClient', () => {
  it('выполняет авторизацию и сохраняет токен', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'jwt-token' }) } as Response);
    const client = new ApiClient({ baseUrl: 'http://localhost:3000' });

    const response = await client.login({ username: 'admin', password: 'secret' });

    expect(response.token).toBe('jwt-token');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', expect.objectContaining({ method: 'POST' }));
  });

  it('передаёт токен при создании проекта', async () => {
    const project = {
      _id: '1',
      uuid: 'uuid',
      name: 'Test',
      description: '',
      logFormat: {},
      defaultTags: [],
      customTags: [],
      accessLevel: 'global',
      telegramNotify: { enabled: false },
      debugMode: false,
      createdAt: '',
      updatedAt: ''
    };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => project } as Response);
    const client = new ApiClient({ token: 'token123' });

    await client.createProject({
      name: 'Test',
      description: '',
      logFormat: {},
      defaultTags: [],
      customTags: [],
      accessLevel: 'global',
      telegramNotify: { enabled: false },
      debugMode: false
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer token123' });
  });

  it('формирует строку запроса для фильтрации логов', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ project: {}, logs: [] }) } as Response);
    const client = new ApiClient();

    await client.filterLogs({ uuid: 'uuid', level: 'ERROR' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/logs?');
    expect(url).toContain('uuid=uuid');
    expect(url).toContain('level=ERROR');
  });

  it('кодирует IP при удалении из белого списка', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as Response);
    const client = new ApiClient();

    await client.deleteWhitelist('192.168.0.1');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/settings/whitelist/192.168.0.1');
  });

  it('выбрасывает ошибку ApiError при статусе не 2xx', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ message: 'Not found' }) } as Response);
    const client = new ApiClient();

    await expect(client.getProject('missing')).rejects.toMatchObject({ message: 'Not found', status: 404 });
  });
});
