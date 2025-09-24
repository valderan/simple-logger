import { apiClient } from './client';
import {
  AuthResponse,
  CreatePingServicePayload,
  CreateProjectPayload,
  LogFilter,
  Project,
  ProjectLogResponse,
  PingService,
  WhitelistEntry,
  WhitelistPayload
} from './types';

export const loginRequest = async (username: string, password: string) => {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', { username, password });
  return data;
};

export const fetchProjects = async () => {
  const { data } = await apiClient.get<Project[]>('/api/projects');
  return data;
};

export const fetchProject = async (uuid: string) => {
  const { data } = await apiClient.get<Project>(`/api/projects/${uuid}`);
  return data;
};

export const createProject = async (payload: CreateProjectPayload) => {
  const { data } = await apiClient.post<Project>('/api/projects', {
    ...payload,
    logFormat: JSON.parse(payload.logFormat)
  });
  return data;
};

export const updateProject = async (uuid: string, payload: CreateProjectPayload) => {
  const { data } = await apiClient.put<Project>(`/api/projects/${uuid}`, {
    ...payload,
    logFormat: JSON.parse(payload.logFormat)
  });
  return data;
};

export const deleteProject = async (uuid: string) => {
  await apiClient.delete(`/api/projects/${uuid}`);
};

export const fetchProjectLogs = async (uuid: string) => {
  const { data } = await apiClient.get<ProjectLogResponse>(`/api/projects/${uuid}/logs`);
  return data;
};

const LOG_FILTER_PARAM_KEYS: (keyof LogFilter)[] = [
  'uuid',
  'level',
  'text',
  'tag',
  'user',
  'ip',
  'service',
  'startDate',
  'endDate',
  'logId'
];

export const filterLogs = async (filter: LogFilter) => {
  const searchParams = new URLSearchParams();
  LOG_FILTER_PARAM_KEYS.forEach((key) => {
    const value = filter[key];
    if (value) {
      searchParams.append(key, value);
    }
  });
  const { data } = await apiClient.get<ProjectLogResponse>(`/api/logs?${searchParams.toString()}`);
  return data;
};

const DELETE_FILTER_PARAM_KEYS: (keyof Omit<LogFilter, 'uuid'>)[] = [
  'level',
  'text',
  'tag',
  'user',
  'ip',
  'service',
  'startDate',
  'endDate',
  'logId'
];

export const deleteLogs = async (uuid: string, filter: Omit<LogFilter, 'uuid'>) => {
  const searchParams = new URLSearchParams();
  DELETE_FILTER_PARAM_KEYS.forEach((key) => {
    const value = filter[key];
    if (value) {
      searchParams.append(key, value);
    }
  });
  const { data } = await apiClient.delete<{ deleted: number }>(`/api/logs/${uuid}?${searchParams.toString()}`);
  return data;
};

export const fetchPingServices = async (uuid: string) => {
  const { data } = await apiClient.get<PingService[]>(`/api/projects/${uuid}/ping-services`);
  return data;
};

export const createPingService = async (uuid: string, payload: CreatePingServicePayload) => {
  const { data } = await apiClient.post<PingService>(`/api/projects/${uuid}/ping-services`, payload);
  return data;
};

export const triggerPingCheck = async (uuid: string) => {
  const { data } = await apiClient.post<PingService[]>(`/api/projects/${uuid}/ping-services/check`, {});
  return data;
};

export const fetchWhitelist = async () => {
  const { data } = await apiClient.get<WhitelistEntry[]>('/api/settings/whitelist');
  return data;
};

export const addWhitelistEntry = async (payload: WhitelistPayload) => {
  const { data } = await apiClient.post<WhitelistEntry>('/api/settings/whitelist', payload);
  return data;
};

export const removeWhitelistEntry = async (ip: string) => {
  await apiClient.delete(`/api/settings/whitelist/${ip}`);
};
