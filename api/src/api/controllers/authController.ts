import { Request, Response } from 'express';
import { defaultLoginAttempts } from '../utils/loginAttempts';
import { defaultSessionStore } from '../utils/sessionStore';

/**
 * Обрабатывает авторизацию администратора по логину и паролю.
 */
export async function login(req: Request, res: Response): Promise<Response> {
  const { username, password } = req.body as { username?: string; password?: string };
  const ip = req.ip ?? 'unknown';
  if (defaultLoginAttempts.isLocked(ip)) {
    return res.status(423).json({ message: 'IP заблокирован на 1 час из-за большого количества неудачных попыток' });
  }

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    defaultLoginAttempts.reset(ip);
    const token = defaultSessionStore.create(username ?? 'admin');
    return res.json({ token });
  }

  defaultLoginAttempts.registerFailure(ip);
  return res.status(401).json({ message: 'Неверные учетные данные' });
}
