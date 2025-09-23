import axios from 'axios';
import { API_URL } from '../config';

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | undefined;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};

export const apiClient = axios.create({
  baseURL: API_URL || '/api',
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
