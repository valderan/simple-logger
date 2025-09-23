import { NextFunction, Request, Response } from 'express';

/**
 * Унифицированная обработка ошибок API.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): Response {
  return res.status(500).json({ message: 'Внутренняя ошибка сервера', details: err.message });
}
