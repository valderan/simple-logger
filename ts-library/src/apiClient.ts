/**
 * Клиент Simple Logger API, реализующий все маршруты согласно спецификации OpenAPI.
 */

import fetch from 'cross-fetch';
import type {
  BlacklistEntry,
  BlacklistPayload,
  BlacklistUpdatePayload,
  AuthRequest,
  AuthResponse,
  DeleteLogsResponse,
  DeletePingServiceResponse,
  DeleteProjectResponse,
  DeleteBlacklistResponse,
  DeleteWhitelistResponse,
  HealthResponse,
  LogFilterParameters,
  LogIngestRequest,
  PingService,
  PingServiceInput,
  PingServiceUpdateInput,
  Project,
  ProjectInput,
  ProjectLogEntry,
  ProjectLogResponse,
  RateLimitSettings,
  TelegramBotUrlInfo,
  TelegramStatus,
  WhitelistEntry,
  WhitelistPayload
} from './types.js';

/**
 * Настройки клиента API.
 */
export interface ApiClientOptions {
  /** Базовый URL сервера API. */
  baseUrl?: string;
  /** Токен авторизации администратора. */
  token?: string;
}

/**
 * Общий метод обработки ошибок API.
 */
class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Клиент для взаимодействия с Simple Logger API.
 */
export class ApiClient {
  /** Базовый URL API. */
  private baseUrl: string;
  /** Токен авторизации. */
  private token?: string;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://localhost:3000';
    this.token = options.token;
  }

  /**
   * Устанавливает или обновляет базовый URL.
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Устанавливает токен авторизации.
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Удаляет сохранённый токен.
   */
  clearToken(): void {
    this.token = undefined;
  }

  /**
   * Проверяет состояние API.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', { method: 'GET' }, false);
  }

  /**
   * Выполняет авторизацию администратора.
   */
  async login(credentials: AuthRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }, false);
    this.token = response.token;
    return response;
  }

  /**
   * Создаёт новый проект.
   */
  async createProject(payload: ProjectInput): Promise<Project> {
    return this.request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Возвращает список проектов.
   */
  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>('/api/projects');
  }

  /**
   * Получает проект по UUID.
   */
  async getProject(uuid: string): Promise<Project> {
    return this.request<Project>(`/api/projects/${uuid}`);
  }

  /**
   * Обновляет данные проекта.
   */
  async updateProject(uuid: string, payload: ProjectInput): Promise<Project> {
    return this.request<Project>(`/api/projects/${uuid}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Удаляет проект.
   */
  async deleteProject(uuid: string): Promise<DeleteProjectResponse> {
    return this.request<DeleteProjectResponse>(`/api/projects/${uuid}`, {
      method: 'DELETE'
    });
  }

  /**
   * Возвращает логи проекта с фильтрами.
   */
  async getProjectLogs(uuid: string, filters: LogFilterParameters = {}): Promise<ProjectLogResponse> {
    const query = this.buildQuery({ ...filters } as unknown as Record<string, unknown>);
    const suffix = query ? `?${query}` : '';
    return this.request<ProjectLogResponse>(`/api/projects/${uuid}/logs${suffix}`);
  }

  /**
   * Получает ping-сервисы проекта.
   */
  async listPingServices(uuid: string): Promise<PingService[]> {
    return this.request<PingService[]>(`/api/projects/${uuid}/ping-services`);
  }

  /**
   * Создаёт новый ping-сервис.
   */
  async createPingService(uuid: string, payload: PingServiceInput): Promise<PingService> {
    return this.request<PingService>(`/api/projects/${uuid}/ping-services`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Принудительно проверяет ping-сервисы проекта.
   */
  async checkPingServices(uuid: string): Promise<PingService[]> {
    return this.request<PingService[]>(`/api/projects/${uuid}/ping-services/check`, {
      method: 'POST'
    });
  }

  /**
   * Обновляет ping-сервис проекта.
   */
  async updatePingService(uuid: string, serviceId: string, payload: PingServiceUpdateInput): Promise<PingService> {
    return this.request<PingService>(`/api/projects/${uuid}/ping-services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Удаляет ping-сервис проекта.
   */
  async deletePingService(uuid: string, serviceId: string): Promise<DeletePingServiceResponse> {
    return this.request<DeletePingServiceResponse>(`/api/projects/${uuid}/ping-services/${serviceId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Фильтрует логи по универсальным параметрам.
   */
  async filterLogs(filters: LogFilterParameters & { uuid: string }): Promise<ProjectLogResponse> {
    const query = this.buildQuery(filters as unknown as Record<string, unknown>);
    return this.request<ProjectLogResponse>(`/api/logs?${query}`);
  }

  /**
   * Отправляет лог напрямую в API.
   */
  async ingestLog(payload: LogIngestRequest): Promise<ProjectLogEntry> {
    return this.request<ProjectLogEntry>('/api/logs', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, false);
  }

  /**
   * Удаляет логи проекта по фильтру.
   */
  async deleteLogs(uuid: string, filters: LogFilterParameters = {}): Promise<DeleteLogsResponse> {
    const query = this.buildQuery(filters as unknown as Record<string, unknown>);
    const suffix = query ? `?${query}` : '';
    return this.request<DeleteLogsResponse>(`/api/logs/${uuid}${suffix}`, {
      method: 'DELETE'
    });
  }

  /**
   * Получает белый список IP.
   */
  async getWhitelist(): Promise<WhitelistEntry[]> {
    return this.request<WhitelistEntry[]>('/api/settings/whitelist');
  }

  /**
   * Создаёт или обновляет запись белого списка.
   */
  async upsertWhitelistEntry(payload: WhitelistPayload): Promise<WhitelistEntry> {
    return this.request<WhitelistEntry>('/api/settings/whitelist', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Удаляет запись белого списка по IP.
   */
  async deleteWhitelist(ip: string): Promise<DeleteWhitelistResponse> {
    return this.request<DeleteWhitelistResponse>(`/api/settings/whitelist/${encodeURIComponent(ip)}`, {
      method: 'DELETE'
    });
  }

  /**
   * Получает чёрный список IP.
   */
  async getBlacklist(): Promise<BlacklistEntry[]> {
    return this.request<BlacklistEntry[]>('/api/settings/blacklist');
  }

  /**
   * Создаёт новую запись чёрного списка.
   */
  async createBlacklistEntry(payload: BlacklistPayload): Promise<BlacklistEntry> {
    return this.request<BlacklistEntry>('/api/settings/blacklist', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Обновляет запись чёрного списка.
   */
  async updateBlacklistEntry(id: string, payload: BlacklistUpdatePayload): Promise<BlacklistEntry> {
    return this.request<BlacklistEntry>(`/api/settings/blacklist/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Удаляет запись чёрного списка.
   */
  async deleteBlacklistEntry(id: string): Promise<DeleteBlacklistResponse> {
    return this.request<DeleteBlacklistResponse>(`/api/settings/blacklist/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  /**
   * Возвращает текущие настройки rate limit API.
   */
  async getRateLimitSettings(): Promise<RateLimitSettings> {
    return this.request<RateLimitSettings>('/api/settings/rate-limit');
  }

  /**
   * Обновляет значение rate limit API.
   */
  async updateRateLimitSettings(payload: RateLimitSettings): Promise<RateLimitSettings> {
    return this.request<RateLimitSettings>('/api/settings/rate-limit', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Проверяет статус Telegram-бота.
   */
  async getTelegramStatus(): Promise<TelegramStatus> {
    return this.request<TelegramStatus>('/api/settings/telegram-status');
  }

  /**
   * Возвращает ссылку на Telegram-бота, если она доступна.
   */
  async getTelegramBotUrl(): Promise<TelegramBotUrlInfo> {
    return this.request<TelegramBotUrlInfo>('/api/settings/telegram-url');
  }

  /**
   * Базовый метод выполнения HTTP-запросов с учётом авторизации.
   */
  private async request<T>(path: string, init: RequestInit = {}, requireAuth = true): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined)
    };
    if (requireAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers
    });
    if (!response.ok) {
      const message = await ApiClient.safeReadError(response);
      throw new ApiError(message, response.status);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  /**
   * Строит строку запроса из объекта.
   */
  private buildQuery(params: Record<string, unknown>): string {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      urlParams.append(key, String(value));
    });
    return urlParams.toString();
  }

  /**
   * Безопасное чтение сообщения об ошибке.
   */
  private static async safeReadError(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { message?: string };
      return payload?.message ?? `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}`;
    }
  }
}
