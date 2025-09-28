export interface CookieOptions {
  days?: number;
}

const DEFAULT_TTL_DAYS = 180;

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const encodedName = `${encodeURIComponent(name)}=`;
  const segments = document.cookie.split(';');
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.slice(encodedName.length));
    }
  }
  return null;
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') {
    return;
  }
  const ttlDays = options.days ?? DEFAULT_TTL_DAYS;
  const expires = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
