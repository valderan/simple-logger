interface AttemptInfo {
  count: number;
  lockedUntil?: number;
}

const LOCK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Утилита для учета неуспешных попыток авторизации.
 */
export class LoginAttempts {
  private readonly attempts = new Map<string, AttemptInfo>();

  constructor(private readonly maxAttempts: number) {}

  registerFailure(ip: string): void {
    const info = this.attempts.get(ip) ?? { count: 0 };
    info.count += 1;
    if (info.count >= this.maxAttempts) {
      info.lockedUntil = Date.now() + LOCK_INTERVAL_MS;
    }
    this.attempts.set(ip, info);
  }

  reset(ip: string): void {
    this.attempts.delete(ip);
  }

  isLocked(ip: string): boolean {
    const info = this.attempts.get(ip);
    if (!info?.lockedUntil) {
      return false;
    }
    if (info.lockedUntil < Date.now()) {
      this.attempts.delete(ip);
      return false;
    }
    return true;
  }
}

export const defaultLoginAttempts = new LoginAttempts(5);
