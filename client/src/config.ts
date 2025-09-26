export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) && import.meta.env.VITE_API_URL !== ''
  ? (import.meta.env.VITE_API_URL as string)
  : '';

export const LOGGER_VERSION = (import.meta.env.VITE_LOGGER_VERSION as string | undefined) &&
  import.meta.env.VITE_LOGGER_VERSION !== ''
  ? (import.meta.env.VITE_LOGGER_VERSION as string)
  : undefined;

export const LOGGER_PAGE_URL = (import.meta.env.VITE_LOGGER_PAGE_URL as string | undefined) &&
  import.meta.env.VITE_LOGGER_PAGE_URL !== ''
  ? (import.meta.env.VITE_LOGGER_PAGE_URL as string)
  : undefined;
