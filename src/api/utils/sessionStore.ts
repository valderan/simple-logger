import { v4 as uuidv4 } from 'uuid';

export interface SessionRecord {
  token: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Простое in-memory хранилище сессий для админского интерфейса.
 */
export class SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(private readonly ttlMinutes: number) {}

  /**
   * Создает новую сессию и возвращает ее токен.
   */
  create(username: string): string {
    const token = uuidv4();
    const now = Date.now();
    const record: SessionRecord = {
      token,
      username,
      createdAt: now,
      expiresAt: now + this.ttlMinutes * 60 * 1000
    };
    this.sessions.set(token, record);
    return token;
  }

  /**
   * Проверяет валидность токена и автоматически очищает просроченные записи.
   */
  validate(token?: string): boolean {
    if (!token) {
      return false;
    }
    const record = this.sessions.get(token);
    if (!record) {
      return false;
    }
    if (record.expiresAt < Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }
}

export const defaultSessionStore = new SessionStore(60);
