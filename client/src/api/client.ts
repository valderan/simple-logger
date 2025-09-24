import axios from 'axios';
import { API_URL } from '../config';

const API_STORAGE_KEY = 'logger_api_url';
const DEFAULT_API_BASE = '/api';

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | undefined;

const getStoredApiUrl = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(API_STORAGE_KEY);
};

const initialBaseUrl = getStoredApiUrl() || API_URL || DEFAULT_API_BASE;
let currentBaseUrl = initialBaseUrl;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};

export const setApiBaseUrl = (baseUrl: string) => {
  const normalized = baseUrl && baseUrl.trim().length > 0 ? baseUrl.trim() : DEFAULT_API_BASE;
  currentBaseUrl = normalized;
  apiClient.defaults.baseURL = normalized;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(API_STORAGE_KEY, normalized);
  }
};

export const getApiBaseUrl = () => currentBaseUrl;

export const apiClient = axios.create({
  baseURL: initialBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  if (authToken && config.headers) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);
