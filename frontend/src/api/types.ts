export interface TelegramRecipient {
  chatId: string;
  tags: string[];
}

export interface TelegramSettings {
  enabled: boolean;
  recipients: TelegramRecipient[];
  antiSpamInterval: number;
}

export type AccessLevel = 'global' | 'whitelist' | 'docker';

export interface Project {
  _id: string;
  uuid: string;
  name: string;
  description?: string;
  logFormat: Record<string, unknown>;
  defaultTags: string[];
  customTags: string[];
  accessLevel: AccessLevel;
  telegramNotify: TelegramSettings;
  debugMode: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LogMetadata {
  ip?: string;
  service?: string;
  user?: string;
  extra?: Record<string, unknown>;
}

export interface LogEntry {
  _id: string;
  projectUuid: string;
  level: string;
  message: string;
  tags: string[];
  timestamp: string;
  metadata?: LogMetadata;
}

export interface ProjectLogResponse {
  project: Project;
  logs: LogEntry[];
}

export interface PingService {
  _id: string;
  projectUuid: string;
  name: string;
  url: string;
  interval: number;
  lastStatus?: 'ok' | 'degraded' | 'down';
  lastCheckedAt?: string;
  telegramTags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WhitelistEntry {
  _id: string;
  ip: string;
  description?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
}

export interface ApiErrorResponse {
  message: string;
  details?: unknown;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  logFormat: string;
  defaultTags: string[];
  customTags: string[];
  accessLevel: AccessLevel;
  telegramNotify: TelegramSettings;
  debugMode: boolean;
}

export interface CreatePingServicePayload {
  name: string;
  url: string;
  interval: number;
  telegramTags: string[];
}

export interface LogFilter {
  uuid: string;
  level?: string;
  text?: string;
  tag?: string;
  user?: string;
  ip?: string;
  service?: string;
  startDate?: string;
  endDate?: string;
  projectUuid?: string;
  logId?: string;
}

export interface WhitelistPayload {
  ip: string;
  description?: string;
}
