export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) && import.meta.env.VITE_API_URL !== ''
  ? (import.meta.env.VITE_API_URL as string)
  : '';

export const APP_VERSION = (typeof __APP_VERSION__ !== 'undefined' ? (__APP_VERSION__ as string) : '0.0.0');

declare const __APP_VERSION__: string;
