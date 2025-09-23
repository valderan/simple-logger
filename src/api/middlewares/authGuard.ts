import { NextFunction, Request, Response } from 'express';
import { defaultSessionStore } from '../utils/sessionStore';

/**
 * Проверяет наличие действующей сессии администратора.
 */
export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!defaultSessionStore.validate(token)) {
    res.status(401).json({ message: 'Требуется авторизация' });
    return;
  }
  next();
}
