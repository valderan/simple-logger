/**
 * Simple Logger API client implemented in TypeScript.
 *
 * The client wraps all available endpoints of the Simple Logger backend and provides
 * strongly-typed helper methods with extensive inline documentation.  The examples located
 * in the same directory demonstrate typical usage patterns for each API operation.
 */

export interface LoginResponse {
  token: string;
}

export interface Project {
  uuid: string;
  name: string;
  description?: string;
  logFormat: Record<string, unknown>;
  defaultTags: string[];
  customTags: string[];
  accessLevel: 'global' | 'whitelist' | 'docker';
  telegramNotify: {
    enabled: boolean;
    recipients: Array<{ chatId: string; tags: string[] }>;
    antiSpamInterval: number;
  };
  debugMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  _id: string;
  projectUuid: string;
  level: string;
  message: string;
  tags: string[];
  timestamp: string;
  metadata: {
    ip?: string;
    service?: string;
    user?: string;
    extra?: Record<string, unknown>;
  };
}

export interface PingService {
  _id: string;
  projectUuid: string;
  name: string;
  url: string;
  interval: number;
  telegramTags: string[];
  lastStatus?: 'ok' | 'fail';
  lastCheckedAt?: string;
}

export interface WhitelistRecord {
  _id: string;
  ip: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLogsResponse {
  project: Project;
  logs: LogEntry[];
}

/**
 * Options that influence how the client performs HTTP requests.
 */
export interface LoggerApiClientOptions {
  /** Base URL of the Simple Logger API (e.g. http://localhost:3000/api). */
  baseUrl: string;
  /** Optional token that will be attached to authenticated requests. */
  token?: string;
  /**
   * Optional fetch implementation.  In browser environments the global fetch is used
   * automatically, while in Node.js users can pass `node-fetch` or similar.
   */
  fetchImplementation?: typeof fetch;
}

/**
 * HTTP helper used internally to perform network requests.
 */
interface HttpRequestOptions {
  method: string;
  path: string;
  body?: unknown;
  requiresAuth?: boolean;
}

/**
 * LoggerApiClient centralizes all API interactions.  It can be reused across multiple
 * requests by updating the stored token once the user is authenticated.
 */
export class LoggerApiClient {
  private baseUrl: string;
  private token?: string;
  private fetchImpl: typeof fetch;

  constructor(options: LoggerApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.fetchImpl = options.fetchImplementation ?? fetch;
  }

  /** Stores a new authorization token to be used for subsequent requests. */
  setToken(token: string): void {
    this.token = token;
  }

  /** Returns the currently configured authorization token (if any). */
  getToken(): string | undefined {
    return this.token;
  }

  /**
   * Performs a POST /api/auth/login request using administrator credentials.
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>({
      method: 'POST',
      path: '/auth/login',
      body: { username, password }
    });
    this.token = response.token;
    return response;
  }

  /**
   * Creates a new logging project.
   */
  async createProject(payload: {
    name: string;
    description?: string;
    logFormat: Record<string, unknown>;
    defaultTags?: string[];
    customTags?: string[];
    accessLevel?: 'global' | 'whitelist' | 'docker';
    telegramNotify?: {
      enabled?: boolean;
      recipients?: Array<{ chatId: string; tags?: string[] }>;
      antiSpamInterval?: number;
    };
    debugMode?: boolean;
  }): Promise<Project> {
    return this.request<Project>({
      method: 'POST',
      path: '/projects',
      body: payload,
      requiresAuth: true
    });
  }

  /** Fetches the list of all projects available to the administrator. */
  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>({
      method: 'GET',
      path: '/projects',
      requiresAuth: true
    });
  }

  /** Fetches a single project by its UUID. */
  async getProject(uuid: string): Promise<Project> {
    return this.request<Project>({
      method: 'GET',
      path: `/projects/${encodeURIComponent(uuid)}`,
      requiresAuth: true
    });
  }

  /** Updates an existing project. UUID remains immutable. */
  async updateProject(
    uuid: string,
    payload: {
      name: string;
      description?: string;
      logFormat: Record<string, unknown>;
      defaultTags?: string[];
      customTags?: string[];
      accessLevel?: 'global' | 'whitelist' | 'docker';
      telegramNotify?: {
        enabled?: boolean;
        recipients?: Array<{ chatId: string; tags?: string[] }>;
        antiSpamInterval?: number;
      };
      debugMode?: boolean;
    }
  ): Promise<Project> {
    return this.request<Project>({
      method: 'PUT',
      path: `/projects/${encodeURIComponent(uuid)}`,
      body: payload,
      requiresAuth: true
    });
  }

  /** Removes a project together with all stored logs. */
  async deleteProject(uuid: string): Promise<{ message: string; deletedLogs: number; deletedPingServices: number }> {
    return this.request<{ message: string; deletedLogs: number; deletedPingServices: number }>({
      method: 'DELETE',
      path: `/projects/${encodeURIComponent(uuid)}`,
      requiresAuth: true
    });
  }

  /** Retrieves logs for a specific project using optional filtering parameters. */
  async getProjectLogs(uuid: string, query: Record<string, string> = {}): Promise<PaginatedLogsResponse> {
    const search = new URLSearchParams(query);
    const queryString = search.toString();
    const path = `/projects/${encodeURIComponent(uuid)}/logs${queryString ? `?${queryString}` : ''}`;
    return this.request<PaginatedLogsResponse>({
      method: 'GET',
      path,
      requiresAuth: true
    });
  }

  /** Adds a ping monitoring service to the selected project. */
  async addPingService(uuid: string, payload: {
    name: string;
    url: string;
    interval?: number;
    telegramTags?: string[];
  }): Promise<PingService> {
    return this.request<PingService>({
      method: 'POST',
      path: `/projects/${encodeURIComponent(uuid)}/ping-services`,
      body: payload,
      requiresAuth: true
    });
  }

  /** Returns all configured ping services for the project. */
  async listPingServices(uuid: string): Promise<PingService[]> {
    return this.request<PingService[]>({
      method: 'GET',
      path: `/projects/${encodeURIComponent(uuid)}/ping-services`,
      requiresAuth: true
    });
  }

  /**
   * Triggers an immediate ping check for every service associated with the project.
   * The API responds with the updated ping-service records.
   */
  async triggerPingCheck(uuid: string): Promise<PingService[]> {
    return this.request<PingService[]>({
      method: 'POST',
      path: `/projects/${encodeURIComponent(uuid)}/ping-services/check`,
      requiresAuth: true
    });
  }

  /** Sends a log entry to the collector using the project's UUID. */
  async ingestLog(payload: {
    uuid: string;
    log: {
      level: string;
      message: string;
      tags?: string[];
      timestamp?: string;
      metadata?: {
        ip?: string;
        service?: string;
        user?: string;
        extra?: Record<string, unknown>;
      };
    };
  }): Promise<LogEntry> {
    return this.request<LogEntry>({
      method: 'POST',
      path: '/logs',
      body: payload
    });
  }

  /** Queries logs globally with additional filter options. */
  async filterLogs(query: Record<string, string>): Promise<PaginatedLogsResponse> {
    const search = new URLSearchParams(query);
    const queryString = search.toString();
    return this.request<PaginatedLogsResponse>({
      method: 'GET',
      path: `/logs${queryString ? `?${queryString}` : ''}`,
      requiresAuth: true
    });
  }

  /** Deletes logs using the same filtering syntax as the listing endpoint. */
  async deleteLogs(uuid: string, query: Record<string, string> = {}): Promise<{ deleted: number }> {
    const search = new URLSearchParams(query);
    const suffix = search.toString();
    const path = `/logs/${encodeURIComponent(uuid)}${suffix ? `?${suffix}` : ''}`;
    return this.request<{ deleted: number }>({
      method: 'DELETE',
      path,
      requiresAuth: true
    });
  }

  /** Returns every IP address currently present in the whitelist. */
  async listWhitelist(): Promise<WhitelistRecord[]> {
    return this.request<WhitelistRecord[]>({
      method: 'GET',
      path: '/settings/whitelist',
      requiresAuth: true
    });
  }

  /** Adds or updates an IP entry in the whitelist. */
  async addWhitelistIp(payload: { ip: string; description?: string }): Promise<WhitelistRecord> {
    return this.request<WhitelistRecord>({
      method: 'POST',
      path: '/settings/whitelist',
      body: payload,
      requiresAuth: true
    });
  }

  /** Removes an IP address from the whitelist. */
  async removeWhitelistIp(ip: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>({
      method: 'DELETE',
      path: `/settings/whitelist/${encodeURIComponent(ip)}`,
      requiresAuth: true
    });
  }

  /**
   * Low-level helper to execute HTTP requests and parse JSON responses.
   */
  private async request<T>({ method, path, body, requiresAuth }: HttpRequestOptions): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (requiresAuth) {
      if (!this.token) {
        throw new Error('Authorization token is required but missing. Call login() first or setToken().');
      }
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request to ${url} failed with status ${response.status}: ${errorText}`);
    }

    return (await response.json()) as T;
  }
}
